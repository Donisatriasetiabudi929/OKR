import { Test, TestingModule } from '@nestjs/testing';
import { ProgrestaskController } from './progrestask.controller';

describe('ProgrestaskController', () => {
  let controller: ProgrestaskController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgrestaskController],
    }).compile();

    controller = module.get<ProgrestaskController>(ProgrestaskController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
