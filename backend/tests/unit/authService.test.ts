import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../src/modules/auth/auth.service';
import type { UserRepository } from '../../src/modules/auth/user.repository';
import type { PasswordHasher } from '../../src/utils/password.hasher';
import type { User } from '../../src/domain/types';
import { ConflictError, UnauthorizedError } from '../../src/errors/AppError';
import { TokenService } from '../../src/utils/token.service';

const now = new Date('2026-01-01T00:00:00Z');
const storedUser: User = { id: 'u1', name: 'Ann', email: 'ann@example.com', passwordHash: 'HASHED', role: 'CUSTOMER', createdAt: now, updatedAt: now };

function setup() {
  const userRepository: UserRepository = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };
  const passwordHasher: PasswordHasher = {
    hash: vi.fn(async (plain: string) => `hashed:${plain}`),
    compare: vi.fn(),
  };
  const tokenService = new TokenService({ secret: 'service-test-secret-service-test-secret', expiresIn: '1h' });
  const service = new AuthService({ userRepository, passwordHasher, tokenService });
  return { userRepository, passwordHasher, tokenService, service };
}

describe('AuthService.register', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it('hashes the password and stores a CUSTOMER', async () => {
    vi.mocked(ctx.userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(ctx.userRepository.create).mockImplementation(async (data) => ({ ...storedUser, ...data }));

    const result = await ctx.service.register({ name: 'Ann', email: 'ann@example.com', password: 'Str0ngPassw0rd' });

    expect(ctx.passwordHasher.hash).toHaveBeenCalledWith('Str0ngPassw0rd');
    expect(ctx.userRepository.create).toHaveBeenCalledWith({
      name: 'Ann',
      email: 'ann@example.com',
      passwordHash: 'hashed:Str0ngPassw0rd',
      role: 'CUSTOMER',
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(ctx.tokenService.verify(result.token)).toMatchObject({ role: 'CUSTOMER' });
  });

  it('can never create an ADMIN even if a role sneaks into the input', async () => {
    vi.mocked(ctx.userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(ctx.userRepository.create).mockImplementation(async (data) => ({ ...storedUser, ...data }));

    const sneaky = { name: 'Eve', email: 'eve@example.com', password: 'Str0ngPassw0rd', role: 'ADMIN' };
    await ctx.service.register(sneaky);

    expect(vi.mocked(ctx.userRepository.create).mock.calls[0]?.[0].role).toBe('CUSTOMER');
  });

  it('normalises the email to lower case', async () => {
    vi.mocked(ctx.userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(ctx.userRepository.create).mockImplementation(async (data) => ({ ...storedUser, ...data }));
    await ctx.service.register({ name: 'Ann', email: 'ANN@Example.COM', password: 'Str0ngPassw0rd' });
    expect(ctx.userRepository.findByEmail).toHaveBeenCalledWith('ann@example.com');
  });

  it('rejects a duplicate email with ConflictError and does not hash or create', async () => {
    vi.mocked(ctx.userRepository.findByEmail).mockResolvedValue(storedUser);
    await expect(ctx.service.register({ name: 'Ann', email: 'ann@example.com', password: 'Str0ngPassw0rd' })).rejects.toBeInstanceOf(ConflictError);
    expect(ctx.userRepository.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  it('returns a token and public user on valid credentials', async () => {
    const { service, userRepository, passwordHasher, tokenService } = setup();
    vi.mocked(userRepository.findByEmail).mockResolvedValue(storedUser);
    vi.mocked(passwordHasher.compare).mockResolvedValue(true);

    const result = await service.login({ email: 'ann@example.com', password: 'Str0ngPassw0rd' });

    expect(result.user).toEqual({ id: 'u1', name: 'Ann', email: 'ann@example.com', role: 'CUSTOMER', createdAt: now });
    expect(tokenService.verify(result.token)).toMatchObject({ sub: 'u1', role: 'CUSTOMER' });
  });

  it('gives the SAME error for an unknown email and a wrong password', async () => {
    const unknown = setup();
    vi.mocked(unknown.userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(unknown.passwordHasher.compare).mockResolvedValue(false);
    const wrong = setup();
    vi.mocked(wrong.userRepository.findByEmail).mockResolvedValue(storedUser);
    vi.mocked(wrong.passwordHasher.compare).mockResolvedValue(false);

    const a = await unknown.service.login({ email: 'nobody@example.com', password: 'x' }).catch((e: unknown) => e);
    const b = await wrong.service.login({ email: 'ann@example.com', password: 'bad' }).catch((e: unknown) => e);

    expect(a).toBeInstanceOf(UnauthorizedError);
    expect(b).toBeInstanceOf(UnauthorizedError);
    expect((a as Error).message).toBe((b as Error).message);
  });

  it('still runs a hash comparison for unknown emails (no timing oracle)', async () => {
    const { service, userRepository, passwordHasher } = setup();
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(passwordHasher.compare).mockResolvedValue(false);
    await service.login({ email: 'nobody@example.com', password: 'whatever' }).catch(() => undefined);
    expect(passwordHasher.compare).toHaveBeenCalledTimes(1);
  });
});

describe('AuthService.getProfile', () => {
  it('returns the public profile', async () => {
    const { service, userRepository } = setup();
    vi.mocked(userRepository.findById).mockResolvedValue(storedUser);
    expect(await service.getProfile('u1')).toEqual({ id: 'u1', name: 'Ann', email: 'ann@example.com', role: 'CUSTOMER', createdAt: now });
  });

  it('throws UnauthorizedError when the user no longer exists', async () => {
    const { service, userRepository } = setup();
    vi.mocked(userRepository.findById).mockResolvedValue(null);
    await expect(service.getProfile('gone')).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
