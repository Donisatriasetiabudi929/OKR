import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateTaskDto{

    @IsString()
    @IsNotEmpty()
    readonly nama: string;

    @IsString()
    readonly deskripsi: string;

    @IsString()
    readonly file: string;

    @IsString()
    readonly link: string;

    @IsString()
    @IsNotEmpty()
    readonly assign_to: string;

    @IsString()
    readonly nama_profile: string;

    @IsString()
    readonly foto_profile: string;

    @IsString()
    @IsNotEmpty()
    readonly start_date: string;

    @IsString()
    @IsNotEmpty()
    readonly end_date: string;

    @IsString()
    readonly status: string;

}