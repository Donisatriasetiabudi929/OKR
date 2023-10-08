import { Test, TestingModule } from '@nestjs/testing';
import { ObjektifService } from './objektif.service';

describe('ObjektifService', () => {
  let service: ObjektifService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObjektifService],
    }).compile();

    service = module.get<ObjektifService>(ObjektifService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
