import { PartialType } from "@nestjs/mapped-types";
import { SignUpDto } from "./signup.dto";
import { IsEmpty } from "class-validator";
import { User } from "src/schema/user.schema";

export class UpdateUserDto extends PartialType(SignUpDto){

    @IsEmpty({ message: "You cannot pass user id" })
    readonly user: User;

}