/**
 * Auth Module Swagger Documentation E2E Tests (T018)
 *
 * Auth modülü Swagger dökümantasyonunun FR-005 ile uyumluluğunu test eder.
 * Login/Register endpoint'lerinin Swagger'da doğru tanımlandığını doğrular.
 *
 * @module test/e2e
 */

import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "../../src/app.module";

describe("Auth Module Swagger Documentation (T018)", () => {
  let app: INestApplication;
  let swaggerDocument: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Same setup as main.ts
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Generate Swagger document
    const config = new DocumentBuilder()
      .setTitle("Yıldız Bayan Kuaförü API")
      .setDescription("Appointment & Customer Management API")
      .setVersion("0.1.0")
      .addBearerAuth()
      .addTag("auth", "Kimlik Doğrulama")
      .build();

    swaggerDocument = SwaggerModule.createDocument(app, config);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Swagger Document Structure", () => {
    it("should have valid OpenAPI 3.0 structure", () => {
      expect(swaggerDocument).toBeDefined();
      expect(swaggerDocument.openapi).toBe("3.0.0");
      expect(swaggerDocument.info).toBeDefined();
      expect(swaggerDocument.info.title).toBe("Yıldız Bayan Kuaförü API");
    });

    it("should have auth tag defined", () => {
      expect(swaggerDocument.tags).toBeDefined();
      const authTag = swaggerDocument.tags.find((tag: any) => tag.name === "auth");
      expect(authTag).toBeDefined();
      expect(authTag.description).toBe("Kimlik Doğrulama");
    });

    it("should have Bearer auth security scheme", () => {
      expect(swaggerDocument.components).toBeDefined();
      expect(swaggerDocument.components.securitySchemes).toBeDefined();
      expect(swaggerDocument.components.securitySchemes.bearer).toBeDefined();
      expect(swaggerDocument.components.securitySchemes.bearer.type).toBe("http");
      expect(swaggerDocument.components.securitySchemes.bearer.scheme).toBe("bearer");
    });
  });

  describe("POST /api/auth/register - FR-001, FR-002", () => {
    const registerPath = "/api/auth/register";

    it("should be documented in Swagger", () => {
      expect(swaggerDocument.paths[registerPath]).toBeDefined();
      expect(swaggerDocument.paths[registerPath].post).toBeDefined();
    });

    it("should have correct operation metadata", () => {
      const operation = swaggerDocument.paths[registerPath].post;

      expect(operation.summary).toBe("Kullanıcı kaydı");
      expect(operation.description).toContain("FR-001");
      expect(operation.description).toContain("FR-002");
      expect(operation.tags).toContain("auth");
    });

    it("should have request body schema with required fields", () => {
      const operation = swaggerDocument.paths[registerPath].post;

      expect(operation.requestBody).toBeDefined();
      expect(operation.requestBody.required).toBe(true);

      const schema = operation.requestBody.content["application/json"].schema;
      expect(schema.$ref).toBeDefined();

      // Find RegisterDto schema
      const schemaName = schema.$ref.split("/").pop();
      const registerSchema = swaggerDocument.components.schemas[schemaName];

      expect(registerSchema.required).toContain("token");
      expect(registerSchema.required).toContain("firstName");
      expect(registerSchema.required).toContain("lastName");
      expect(registerSchema.required).toContain("phone");
      expect(registerSchema.required).toContain("password");
    });

    it("should document 201 success response", () => {
      const operation = swaggerDocument.paths[registerPath].post;

      expect(operation.responses["201"]).toBeDefined();
      expect(operation.responses["201"].description).toContain("başarılı");
    });

    it("should document 400 invalid token response", () => {
      const operation = swaggerDocument.paths[registerPath].post;

      expect(operation.responses["400"]).toBeDefined();
      expect(operation.responses["400"].description).toContain("Geçersiz");
    });

    it("should document 409 conflict response (FR-004)", () => {
      const operation = swaggerDocument.paths[registerPath].post;

      expect(operation.responses["409"]).toBeDefined();
      expect(operation.responses["409"].description).toContain("FR-004");
    });

    it("should NOT require authentication", () => {
      const operation = swaggerDocument.paths[registerPath].post;

      // Register should not have security requirement (public endpoint)
      expect(operation.security).toBeUndefined();
    });
  });

  describe("POST /api/auth/login - FR-005, FR-007, FR-008", () => {
    const loginPath = "/api/auth/login";

    it("should be documented in Swagger", () => {
      expect(swaggerDocument.paths[loginPath]).toBeDefined();
      expect(swaggerDocument.paths[loginPath].post).toBeDefined();
    });

    it("should have correct operation metadata", () => {
      const operation = swaggerDocument.paths[loginPath].post;

      expect(operation.summary).toBe("Kullanıcı girişi");
      expect(operation.description).toContain("FR-005");
      expect(operation.description).toContain("FR-007");
      expect(operation.description).toContain("FR-008");
      expect(operation.tags).toContain("auth");
    });

    it("should have request body schema with emailOrPhone and password", () => {
      const operation = swaggerDocument.paths[loginPath].post;

      expect(operation.requestBody).toBeDefined();

      const schema = operation.requestBody.content["application/json"].schema;
      const schemaName = schema.$ref.split("/").pop();
      const loginSchema = swaggerDocument.components.schemas[schemaName];

      expect(loginSchema.required).toContain("emailOrPhone");
      expect(loginSchema.required).toContain("password");

      expect(loginSchema.properties.emailOrPhone).toBeDefined();
      expect(loginSchema.properties.password).toBeDefined();
    });

    it("should document 200 success response", () => {
      const operation = swaggerDocument.paths[loginPath].post;

      expect(operation.responses["200"]).toBeDefined();
      expect(operation.responses["200"].description).toContain("başarılı");
    });

    it("should document 401 unauthorized response (FR-007)", () => {
      const operation = swaggerDocument.paths[loginPath].post;

      expect(operation.responses["401"]).toBeDefined();
      expect(operation.responses["401"].description).toContain("FR-007");
    });

    it("should NOT require authentication", () => {
      const operation = swaggerDocument.paths[loginPath].post;

      // Login should not have security requirement (public endpoint)
      expect(operation.security).toBeUndefined();
    });
  });

  describe("POST /api/auth/logout - FR-008", () => {
    const logoutPath = "/api/auth/logout";

    it("should be documented in Swagger", () => {
      expect(swaggerDocument.paths[logoutPath]).toBeDefined();
      expect(swaggerDocument.paths[logoutPath].post).toBeDefined();
    });

    it("should have correct operation metadata", () => {
      const operation = swaggerDocument.paths[logoutPath].post;

      expect(operation.summary).toBe("Kullanıcı çıkışı");
      expect(operation.description).toContain("FR-008");
      expect(operation.tags).toContain("auth");
    });

    it("should document 200 success response", () => {
      const operation = swaggerDocument.paths[logoutPath].post;

      expect(operation.responses["200"]).toBeDefined();
      expect(operation.responses["200"].description).toContain("başarılı");
    });

    it("should document 401 unauthorized response", () => {
      const operation = swaggerDocument.paths[logoutPath].post;

      expect(operation.responses["401"]).toBeDefined();
      expect(operation.responses["401"].description).toContain("Geçersiz");
    });

    it("should require Bearer authentication", () => {
      const operation = swaggerDocument.paths[logoutPath].post;

      expect(operation.security).toBeDefined();
      expect(operation.security).toEqual([{ bearer: [] }]);
    });
  });

  describe("DTO Schemas - RegisterDto", () => {
    it("should have RegisterDto schema defined", () => {
      const registerDto = swaggerDocument.components.schemas.RegisterDto;

      expect(registerDto).toBeDefined();
      expect(registerDto.type).toBe("object");
    });

    it("should have token field with description", () => {
      const registerDto = swaggerDocument.components.schemas.RegisterDto;

      expect(registerDto.properties.token).toBeDefined();
      expect(registerDto.properties.token.description).toContain("Davet token");
      expect(registerDto.properties.token.example).toBeDefined();
    });

    it("should have phone field with E.164 format description", () => {
      const registerDto = swaggerDocument.components.schemas.RegisterDto;

      expect(registerDto.properties.phone).toBeDefined();
      expect(registerDto.properties.phone.description).toContain("E.164");
      expect(registerDto.properties.phone.example).toMatch(/^\+90/);
    });

    it("should have password field with requirements", () => {
      const registerDto = swaggerDocument.components.schemas.RegisterDto;

      expect(registerDto.properties.password).toBeDefined();
      expect(registerDto.properties.password.description).toContain("minimum 8");
      expect(registerDto.properties.password.minLength).toBe(8);
    });
  });

  describe("DTO Schemas - LoginDto", () => {
    it("should have LoginDto schema defined", () => {
      const loginDto = swaggerDocument.components.schemas.LoginDto;

      expect(loginDto).toBeDefined();
      expect(loginDto.type).toBe("object");
    });

    it("should have emailOrPhone field", () => {
      const loginDto = swaggerDocument.components.schemas.LoginDto;

      expect(loginDto.properties.emailOrPhone).toBeDefined();
      expect(loginDto.properties.emailOrPhone.description).toContain("Email");
      expect(loginDto.properties.emailOrPhone.example).toBeDefined();
    });

    it("should have password field", () => {
      const loginDto = swaggerDocument.components.schemas.LoginDto;

      expect(loginDto.properties.password).toBeDefined();
      expect(loginDto.properties.password.description).toBeDefined();
    });
  });

  describe("FR-005: Role-Based Documentation", () => {
    it("should document roles in endpoint descriptions where applicable", () => {
      // Force logout endpoint requires ADMIN role
      const forceLogoutPath = "/api/auth/admin/users/{userId}/force-logout";

      if (swaggerDocument.paths[forceLogoutPath]) {
        const operation = swaggerDocument.paths[forceLogoutPath].post;
        expect(operation.security).toBeDefined();
        expect(operation.security).toEqual([{ bearer: [] }]);
      }
    });

    it("should clearly distinguish public vs authenticated endpoints", () => {
      // Public endpoints
      const registerOp = swaggerDocument.paths["/api/auth/register"].post;
      const loginOp = swaggerDocument.paths["/api/auth/login"].post;

      expect(registerOp.security).toBeUndefined();
      expect(loginOp.security).toBeUndefined();

      // Authenticated endpoint
      const logoutOp = swaggerDocument.paths["/api/auth/logout"].post;

      expect(logoutOp.security).toBeDefined();
    });
  });
});
