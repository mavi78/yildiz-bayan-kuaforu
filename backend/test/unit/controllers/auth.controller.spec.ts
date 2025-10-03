import { AuthController } from "@modules/auth/auth.controller";
import { RegisterUsecase, RegisterResult } from "@usecases/auth/register.usecase";
import { LoginUsecase } from "@usecases/auth/login.usecase";
import { LogoutUsecase, LogoutResult } from "@usecases/auth/logout.usecase";

const createController = () => {
  const registerUsecase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<RegisterUsecase>;

  const loginUsecase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<LoginUsecase>;

  const logoutUsecase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<LogoutUsecase>;

  const controller = new AuthController(registerUsecase, loginUsecase, logoutUsecase);

  return {
    controller,
    registerUsecase,
    loginUsecase,
    logoutUsecase,
  };
};

describe("AuthController", () => {
  it("should delegate registration to RegisterUsecase", async () => {
    const { controller, registerUsecase } = createController();
    const payload = {
      token: "token-123",
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "+905551234567",
      password: "Sifre123",
    };
    const expected: RegisterResult = {
      access_token: "jwt",
      expires_in: "7d",
      user: {
        id: "user-1",
        email: "test@example.com",
        firstName: "Ayşe",
        lastName: "Yılmaz",
        role: "CUSTOMER" as any,
      },
    };

    registerUsecase.execute.mockResolvedValue(expected);

    const result = await controller.register(payload);

    expect(registerUsecase.execute).toHaveBeenCalledWith(payload);
    expect(result).toEqual(expected);
  });

  it("should delegate login to LoginUsecase", async () => {
    const { controller, loginUsecase } = createController();
    const payload = {
      emailOrPhone: "test@example.com",
      password: "Sifre123",
    };
    const expected = {
      access_token: "jwt",
      expires_in: "8h",
      user: {
        id: "user-1",
        email: "test@example.com",
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
      },
    };

    loginUsecase.execute.mockResolvedValue(expected as any);

    const result = await controller.login(payload);

    expect(loginUsecase.execute).toHaveBeenCalledWith(payload);
    expect(result).toEqual(expected);
  });

  it("should extract bearer token and call logout usecase", async () => {
    const { controller, logoutUsecase } = createController();
    const expected: LogoutResult = {
      success: true,
      message: "ok",
    };

    logoutUsecase.execute.mockResolvedValue(expected);

    const result = await controller.logout("Bearer test-token");

    expect(logoutUsecase.execute).toHaveBeenCalledWith({ token: "test-token" });
    expect(result).toEqual(expected);
  });

  it("should throw error when authorization header missing on logout", async () => {
    const { controller } = createController();

    await expect(controller.logout(undefined)).rejects.toThrow("Authorization header is required");
  });
});
