import { Test, TestingModule } from '@nestjs/testing';
import { KeyresultService } from './keyresult.service';

describe('KeyresultService', () => {
  let service: KeyresultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeyresultService],
    }).compile();

    service = module.get<KeyresultService>(KeyresultService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
