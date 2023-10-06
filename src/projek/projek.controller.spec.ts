import { Test, TestingModule } from '@nestjs/testing';
import { ProjekController } from './projek.controller';

describe('ProjekController', () => {
  let controller: ProjekController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjekController],
    }).compile();

    controller = module.get<ProjekController>(ProjekController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
