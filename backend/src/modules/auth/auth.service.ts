import type { PublicUser, User } from '../../domain/types';
import { ConflictError, UnauthorizedError } from '../../errors/AppError';
import type { PasswordHasher } from '../../utils/password.hasher';
import type { TokenService } from '../../utils/token.service';
import type { LoginInput, RegisterInput } from './auth.schemas';
import type { UserRepository } from './user.repository';

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export interface AuthServiceDeps {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
}

const INVALID_CREDENTIALS = 'Invalid email or password';

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

export class AuthService {
  private readonly users: UserRepository;
  private readonly hasher: PasswordHasher;
  private readonly tokens: TokenService;
  // Compared against when the email is unknown so response time does not reveal which emails exist.
  private dummyHash?: Promise<string>;

  constructor(deps: AuthServiceDeps) {
    this.users = deps.userRepository;
    this.hasher = deps.passwordHasher;
    this.tokens = deps.tokenService;
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictError('An account with this email already exists');
    }
    const passwordHash = await this.hasher.hash(input.password);
    // The role is hard-coded: public registration must never be able to mint an ADMIN.
    const user = await this.users.create({ name: input.name, email, passwordHash, role: 'CUSTOMER' });
    return this.issue(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email.toLowerCase());
    const hashToCheck = user?.passwordHash ?? (await this.getDummyHash());
    const matches = await this.hasher.compare(input.password, hashToCheck);
    // One message for both failure modes so attackers cannot enumerate accounts.
    if (!user || !matches) throw new UnauthorizedError(INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');
    return this.issue(user);
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedError('Account no longer exists');
    return toPublicUser(user);
  }

  private issue(user: User): AuthResult {
    return { user: toPublicUser(user), token: this.tokens.sign({ sub: user.id, role: user.role }) };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash('timing-equalisation-placeholder');
    return this.dummyHash;
  }
}
