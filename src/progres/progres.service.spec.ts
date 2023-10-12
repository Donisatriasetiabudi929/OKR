import { Test, TestingModule } from '@nestjs/testing';
import { ProgresService } from './progres.service';

describe('ProgresService', () => {
  let service: ProgresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgresService],
    }).compile();

    service = module.get<ProgresService>(ProgresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
