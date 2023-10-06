import { Test, TestingModule } from '@nestjs/testing';
import { ProjekService } from './projek.service';

describe('ProjekService', () => {
  let service: ProjekService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjekService],
    }).compile();

    service = module.get<ProjekService>(ProjekService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
