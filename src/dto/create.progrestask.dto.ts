import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateProgresTaskDto {

    @IsString()
    @IsNotEmpty()
    readonly id_task: string;

    @IsString()
    readonly id_profile: string;

    @IsString()
    readonly nama_profile: string;

    @IsString()
    readonly foto_profile: string;

    @IsString()
    @IsNotEmpty()
    readonly tanggal: string;

    @IsString()
    @IsNotEmpty()
    readonly note: string;

    readonly files: Express.Multer.File;

    @IsString()
    readonly link: string;

    @IsString()
    readonly status: string;

}