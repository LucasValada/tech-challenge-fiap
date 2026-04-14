import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

const mockAppService = {
  getHello: jest.fn(),
};

describe("AppController", () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: mockAppService }],
    }).compile();

    controller = module.get<AppController>(AppController);
    jest.clearAllMocks();
  });

  it("deve retornar a resposta do AppService.getHello", async () => {
    mockAppService.getHello.mockResolvedValue("Chegou no banco carai");

    const result = await controller.getHello();

    expect(result).toBe("Chegou no banco carai");
    expect(mockAppService.getHello).toHaveBeenCalled();
  });
});
