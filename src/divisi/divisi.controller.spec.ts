import { Test, TestingModule } from '@nestjs/testing';
import { DivisiController } from './divisi.controller';

describe('DivisiController', () => {
  let controller: DivisiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DivisiController],
    }).compile();

    controller = module.get<DivisiController>(DivisiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
