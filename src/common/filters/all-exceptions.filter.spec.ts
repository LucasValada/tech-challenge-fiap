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

  it("deve retornar 401 com mensagem original para UnauthorizedException", () => {
    const { host, status, json } = createMockHost();
    const exception = new UnauthorizedException("Credenciais inválidas");

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: "Credenciais inválidas",
      }),
    );
  });

  it("deve retornar 400 com array de mensagens para erros de validação", () => {
    const { host, status, json } = createMockHost();
    const exception = new BadRequestException({
      message: ["nome não pode ser vazio", "email deve ser válido"],
      error: "Bad Request",
      statusCode: 400,
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ["nome não pode ser vazio", "email deve ser válido"],
        error: "Bad Request",
      }),
    );
  });

  it("deve retornar 404 para NotFoundException", () => {
    const { host, status, json } = createMockHost();
    const exception = new NotFoundException("Cliente não encontrado");

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Cliente não encontrado",
      }),
    );
  });

  it("deve retornar 409 para Prisma P2002 (unique constraint)", () => {
    const { host, status, json } = createMockHost("/clientes", "POST");
    const exception = createPrismaError("P2002", { target: ["email"] });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: "Registro com email já existe",
        error: "Conflict",
      }),
    );
  });

  it("deve retornar 404 para Prisma P2025 (registro não encontrado)", () => {
    const { host, status, json } = createMockHost();
    const exception = createPrismaError("P2025");

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Registro não encontrado",
        error: "Not Found",
      }),
    );
  });

  it("deve retornar 400 para Prisma P2003 (chave estrangeira)", () => {
    const { host, status, json } = createMockHost();
    const exception = createPrismaError("P2003", {
      field_name: "clienteId",
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Referência inválida no campo: clienteId",
        error: "Bad Request",
      }),
    );
  });

  it("deve retornar 500 para erros Prisma desconhecidos", () => {
    const { host, status, json } = createMockHost();
    const exception = createPrismaError("P2010");

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Erro interno do servidor",
        error: "Internal Server Error",
      }),
    );
  });

  it("deve retornar 500 com mensagem genérica para erros desconhecidos", () => {
    const { host, status, json } = createMockHost();
    const exception = new Error("SELECT * FROM users WHERE id = 1");

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Erro interno do servidor",
      }),
    );
  });

  it("não deve vazar detalhes internos para erros genéricos", () => {
    const { host, json } = createMockHost();
    const exception = new Error(
      "Connection refused: postgresql://user:pass@localhost:5432",
    );

    filter.catch(exception, host);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const responseBody = json.mock.calls[0][0] as Record<string, unknown>;
    expect(responseBody.message).toBe("Erro interno do servidor");
    expect(JSON.stringify(responseBody)).not.toContain("postgresql");
    expect(JSON.stringify(responseBody)).not.toContain("Connection refused");
  });

  it("deve incluir timestamp e path na resposta", () => {
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
