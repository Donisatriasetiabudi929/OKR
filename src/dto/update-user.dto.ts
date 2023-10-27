import { PartialType } from "@nestjs/mapped-types";
import { SignUpDto } from "./signup.dto";
import { IsEmpty, IsString, MinLength } from "class-validator";
import { User } from "src/schema/user.schema";

export class UpdateUserDto {

    @IsString()
    readonly name: string;

    @IsString()
    @MinLength(6)
    readonly password: string;

    @IsString()
    readonly role: string;

}