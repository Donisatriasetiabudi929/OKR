import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {

    @IsNotEmpty()
    @IsString()
    readonly name: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    readonly password: string;
}