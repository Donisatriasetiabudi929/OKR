import { Test, TestingModule } from '@nestjs/testing';
import { ProgrestaskService } from './progrestask.service';

describe('ProgrestaskService', () => {
  let service: ProgrestaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgrestaskService],
    }).compile();

    service = module.get<ProgrestaskService>(ProgrestaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
