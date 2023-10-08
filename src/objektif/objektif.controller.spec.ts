import { Test, TestingModule } from '@nestjs/testing';
import { ObjektifController } from './objektif.controller';

describe('ObjektifController', () => {
  let controller: ObjektifController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObjektifController],
    }).compile();

    controller = module.get<ObjektifController>(ObjektifController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
