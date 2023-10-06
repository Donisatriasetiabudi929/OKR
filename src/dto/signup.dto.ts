import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignUpDto{
    @IsNotEmpty()//Untuk mengecek bahwa jangan sampai field nya tidak terisi
    @IsString()//Untuk memberitahu bahwa data yang diinput bertype string
    readonly name: string;


    @IsNotEmpty()//Untuk mengecek bahwa jangan sampai field nya tidak terisi
    @IsString()//Untuk memberitahu bahwa data yang diinput bertype string
    @MinLength(6)//Untuk mengatur minimal length value
    readonly password:string;

    @IsString()
    readonly confirmPassword:string;

    
    readonly role:string;
}