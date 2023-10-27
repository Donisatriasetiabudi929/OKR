import { IsNotEmpty, IsString } from "class-validator";

export class CreateObjektifDto {
    @IsString()
    @IsNotEmpty()
    readonly id_projek: string;

    @IsString()
    @IsNotEmpty()
    readonly nama: string;

    @IsString()
    @IsNotEmpty()
    readonly start_date: string;

    @IsString()
    @IsNotEmpty()
    readonly end_date: string;

    readonly status: string;


}