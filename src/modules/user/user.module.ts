import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";

//instancia do module para só importar em app / main
@Module({
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
