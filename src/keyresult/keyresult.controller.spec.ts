import { Test, TestingModule } from '@nestjs/testing';
import { KeyresultController } from './keyresult.controller';

describe('KeyresultController', () => {
  let controller: KeyresultController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeyresultController],
    }).compile();

    controller = module.get<KeyresultController>(KeyresultController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
