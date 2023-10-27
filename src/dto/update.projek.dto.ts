import { PartialType } from "@nestjs/mapped-types";
import { IsEmpty } from "class-validator";
import { User } from "../schema/user.schema";
import { CreateProjekDto } from "./create.projek.dto";

export class UpdateProjekDto extends PartialType(CreateProjekDto) {

    @IsEmpty({ message: "You cannot pass user id" })
    readonly user: User;

}