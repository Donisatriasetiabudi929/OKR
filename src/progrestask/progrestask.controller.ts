import { Controller } from '@nestjs/common';
import { ProgrestaskService } from './progrestask.service';

@Controller('progrestask')
export class ProgrestaskController {
    constructor(
        private readonly progrestaskService: ProgrestaskService) { }
}
