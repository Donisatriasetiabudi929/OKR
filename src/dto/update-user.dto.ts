import { PartialType } from "@nestjs/mapped-types";
import { SignUpDto } from "./signup.dto";
import { IsEmpty, IsString, MinLength } from "class-validator";
import { User } from "src/schema/user.schema";

export class UpdateUserDto {

    @IsString()//Untuk memberitahu bahwa data yang diinput bertype string
    readonly name:string;

    @IsString()//Untuk memberitahu bahwa data yang diinput bertype string
    @MinLength(6)//Untuk mengatur minimal length value
    readonly password:string;

    @IsString()//Untuk memberitahu bahwa data yang diinput bertype string
    readonly role:string;

}