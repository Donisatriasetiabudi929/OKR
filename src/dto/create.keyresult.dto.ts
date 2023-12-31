import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateKeyresultDto {
    @IsString()
    readonly id_projek: string;

    @IsString()
    @IsNotEmpty()
    readonly id_objek: string;

    @IsString()
    @IsNotEmpty()
    readonly nama: string;

    readonly file: string;

    @IsString()
    readonly link: string;

    @IsString()
    @IsNotEmpty()
    readonly assign_to: string;

    @IsString()
    readonly nama_profile: string;

    readonly foto_profile: string;

    @IsNumber()
    @IsNotEmpty()
    readonly target_value: string;

    @IsNumber()
    @IsNotEmpty()
    readonly days: string;

    @IsNumber()
    readonly current_value: number;

    readonly status: string;

}