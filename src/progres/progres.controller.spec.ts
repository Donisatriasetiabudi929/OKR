import { Test, TestingModule } from '@nestjs/testing';
import { ProgresController } from './progres.controller';

describe('ProgresController', () => {
  let controller: ProgresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgresController],
    }).compile();

    controller = module.get<ProgresController>(ProgresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
