import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors/AppError';
import { sendSuccess } from '../../utils/response';
import { loginSchema, registerSchema } from './auth.schemas';
import type { AuthService } from './auth.service';

/** Controllers only translate HTTP <-> service calls; all rules live in the service. */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const input = registerSchema.parse(req.body);
    sendSuccess(res, await this.authService.register(input), { status: 201 });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const input = loginSchema.parse(req.body);
    sendSuccess(res, await this.authService.login(input));
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    sendSuccess(res, { user: await this.authService.getProfile(req.user.id) });
  };
}
