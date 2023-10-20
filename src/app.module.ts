import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UserSchema } from './schema/user.schema';
import { DivisiController } from './divisi/divisi.controller';
import { DivisiService } from './divisi/divisi.service';
import { DivisiSchema } from './schema/divisi.schema';
import { ProjekController } from './projek/projek.controller';
import { ProjekService } from './projek/projek.service';
import { ProjekSchema } from './schema/projek.schema';
import { ProfileController } from './profile/profile.controller';
import { ProfileService } from './profile/profile.service';
import { ProfileSchema } from './schema/profile.schema';
import { ObjektifController } from './objektif/objektif.controller';
import { ObjektifService } from './objektif/objektif.service';
import { ObjektifSchema } from './schema/objektif.schema';
import { KeyresultController } from './keyresult/keyresult.controller';
import { KeyresultService } from './keyresult/keyresult.service';
import { KeyresultSchema } from './schema/keyresult.schema';
import { ProgresController } from './progres/progres.controller';
import { ProgresService } from './progres/progres.service';
import { ProgresSchema } from './schema/progres.schema';
import { ProgresGateway } from './progres/progres.gateway';
import { TaskController } from './task/task.controller';
import { TaskService } from './task/task.service';
import { ProgrestaskController } from './progrestask/progrestask.controller';
import { ProgrestaskService } from './progrestask/progrestask.service';
import { TaskSchema } from './schema/task.schema';
import { ProgrestaskSchema } from './schema/progrestask.schema';


@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule.register({defaultStrategy: 'jwt'}),
        JwtModule.registerAsync({
          imports: [ConfigModule],
            useFactory: (config: ConfigService) =>{
                return{
                    secret: config.get<string>('JWT_SECRET'),
                    signOptions: {
                        expiresIn :config.get<string | number>('JWT_EXPIRES'),
                    },
                };
            },            
            inject: [ConfigService],
        }),
    MongooseModule.forRoot('mongodb://127.0.0.1:27017/okr'),
    MongooseModule.forFeature([{name: 'User', schema: UserSchema}]),
    MongooseModule.forFeature([{name: 'Divisi', schema: DivisiSchema}]),
    MongooseModule.forFeature([{name: 'Projek', schema: ProjekSchema}]),
    MongooseModule.forFeature([{name: 'Profile', schema: ProfileSchema}]),
    MongooseModule.forFeature([{name: 'Objektif', schema: ObjektifSchema}]),
    MongooseModule.forFeature([{name: 'Keyresult', schema: KeyresultSchema}]),
    MongooseModule.forFeature([{name: 'Progres', schema: ProgresSchema}]),
    MongooseModule.forFeature([{name: 'Task', schema: TaskSchema}]),
    MongooseModule.forFeature([{name: 'Progrestask', schema: ProgrestaskSchema}]),
  ],
  controllers: [AppController, AuthController, DivisiController, ProjekController, ProfileController, ObjektifController, KeyresultController, ProgresController, TaskController, ProgrestaskController],
  providers: [AppService, AuthService, JwtStrategy, DivisiService, ProjekService, ProfileService, ObjektifService, KeyresultService, ProgresService, ProgresGateway, TaskService, ProgrestaskService],
  exports: [JwtStrategy, PassportModule],
})
export class AppModule {}
