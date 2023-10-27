import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignUpDto {
    @IsNotEmpty()
    @IsString()
    readonly name: string;


    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    readonly password: string;

    @IsString()
    readonly confirmPassword: string;


    readonly role: string;
}