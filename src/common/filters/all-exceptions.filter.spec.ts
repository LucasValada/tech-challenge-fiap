import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client-runtime-utils";
import { AllExceptionsFilter } from "./all-exceptions.filter";

function createMockHost(url = "/test", method = "GET") {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const mockResponse = { status };
  const mockRequest = { url, method };
  const host = {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function createPrismaError(
  code: string,
  meta?: Record<string, unknown>,
): PrismaClientKnownRequestError {
  return new PrismaClientKnownRequestError("Prisma error", {
    code,
    clientVersion: "7.0.0",
    meta,
  });
}

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.clearAllMocks();
    jest.spyOn(filter["logger"], "error").mockImplementation();
  });

  it("should return 401 with original message for UnauthorizedException", () => {
    const { host, status, json } = createMockHost();
    const exception = new UnauthorizedException("Invalid credentials");

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: "Invalid credentials",
      }),
    );
  });

  it("should return 400 with message array for validation errors", () => {
    const { host, status, json } = createMockHost();
    const exception = new BadRequestException({
      message: ["name must not be empty", "email must be valid"],
      error: "Bad Request",
      statusCode: 400,
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ["name must not be empty", "email must be valid"],
        error: "Bad Request",
      }),
    );
  });

  it("should return 404 for NotFoundException", () => {
    const { host, status, json } = createMockHost();
    const exception = new NotFoundException("Client not found");

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Client not found",
      }),
    );
  });

  it("should return 409 for Prisma P2002 (unique constraint)", () => {
    const { host, status, json } = createMockHost("/clientes", "POST");
    const exception = createPrismaError("P2002", { target: ["email"] });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: "Record with email already exists",
        error: "Conflict",
      }),
    );
  });

  it("should return 404 for Prisma P2025 (record not found)", () => {
    const { host, status, json } = createMockHost();
    const exception = createPrismaError("P2025");

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Record not found",
        error: "Not Found",
      }),
    );
  });

  it("should return 400 for Prisma P2003 (foreign key constraint)", () => {
    const { host, status, json } = createMockHost();
    const exception = createPrismaError("P2003", {
      field_name: "clienteId",
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Invalid reference in field: clienteId",
        error: "Bad Request",
      }),
    );
  });

  it("should return 500 for unknown Prisma errors", () => {
    const { host, status, json } = createMockHost();
    const exception = createPrismaError("P2010");

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
        error: "Internal Server Error",
      }),
    );
  });

  it("should return 500 with generic message for unknown errors", () => {
    const { host, status, json } = createMockHost();
    const exception = new Error("SELECT * FROM users WHERE id = 1");

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
      }),
    );
  });

  it("should not leak internal details for unknown errors", () => {
    const { host, json } = createMockHost();
    const exception = new Error(
      "Connection refused: postgresql://user:pass@localhost:5432",
    );

    filter.catch(exception, host);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const responseBody = json.mock.calls[0][0] as Record<string, unknown>;
    expect(responseBody.message).toBe("Internal server error");
    expect(JSON.stringify(responseBody)).not.toContain("postgresql");
    expect(JSON.stringify(responseBody)).not.toContain("Connection refused");
  });

  it("should include timestamp and path in response", () => {
    const { host, json } = createMockHost("/veiculos/123", "GET");
    const exception = new NotFoundException();

    filter.catch(exception, host);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const responseBody = json.mock.calls[0][0] as Record<string, unknown>;
    expect(responseBody.path).toBe("/veiculos/123");
    expect(responseBody.timestamp).toBeDefined();
    expect(new Date(responseBody.timestamp as string).toISOString()).toBe(
      responseBody.timestamp,
    );
  });
});
