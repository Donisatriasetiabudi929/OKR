import { Body, Controller, Post, UploadedFile, UseInterceptors, Headers, NotFoundException, HttpStatus, Put, Res, Param, Get, UseGuards, Req, Delete } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomBytes } from 'crypto';
import { AuthService } from 'src/auth/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateProfileDto } from 'src/dto/create.profile';

@Controller('profile')
export class ProfileController {
    constructor(
        private readonly profileService: ProfileService,
        private readonly authService: AuthService
    ) { }

    @Post('/add')
    @UseInterceptors(FileInterceptor('foto'))
    async uploadFile(
        @UploadedFile() uploadedFile: Express.Multer.File,
        @Body() createProfileDto: CreateProfileDto,
        @Headers() headers: Record<string, string>,
    ): Promise<any> {
        try {
            if (!uploadedFile) {
                return { message: 'Tidak ada file yang diunggah' };
            }

            const stream = require('stream');
            const readableStream = new stream.PassThrough();
            readableStream.end(uploadedFile.buffer);

            const authHeader = headers['authorization'];

            if (!authHeader) {
                return { message: 'Tidak ada token yang diberikan' };
            }

            const token = authHeader.split(' ')[1];

            const { id_user, role } = await this.authService.getUserFromToken(token);

            if (!id_user) {
                return { message: 'id_auth tidak valid' };
            }

            // const existingProfile = await this.profileService.getProfileByEmail(email);

            // if (existingProfile) {
            //     return { message: `Profil dengan email ${email} sudah ada` };
            // }

            console.log(`id_auth: ${id_user}, role: ${role}`);

            const uniqueCode = randomBytes(5).toString('hex');
            const objectName = `${uniqueCode}-${uploadedFile.originalname}`;
            const {
                nama,
                email,
                divisi,
                notelpon,
                gender,
                tanggal_lahir,
                bio,
                sosmed,
                grade
            } = createProfileDto;

            await this.profileService.uploadFile('okr.profile', objectName, readableStream, uploadedFile.mimetype);


            await this.profileService.createUploud(
                id_user,
                email,
                role,
                nama,
                divisi,
                notelpon,
                gender,
                tanggal_lahir,
                objectName,
                bio,
                sosmed,
                grade
            );
            return { message: 'Data berhasil dikirim' };
        } catch (error) {
            console.error(`Error saat mengunggah file: ${error}`);
            throw new Error('Terjadi kesalahan saat mengunggah file');
        }
    }

    @Put('/edit')
    @UseInterceptors(FileInterceptor('foto'))
    async updateUploud(
        @Res() Response,
        @Param('id') uploudId: string,
        @Body() createProfileDto: CreateProfileDto,
        @UploadedFile() uploadeddFile: Express.Multer.File,
        @Headers() headers: Record<string, string>,
    ) {
        try {
            const { id_user } = await this.authService.getUserFromToken(headers['authorization'].split(' ')[1]);
            if (!id_user) {
                return Response.status(HttpStatus.UNAUTHORIZED).json({
                    message: 'Token tidak valid',
                });
            }
            const uploudData = await this.profileService.getProfileByIdAuth(id_user);
            if (uploadeddFile) {
                await this.profileService.deleteFile('okr.profile', uploudData.foto);
                const {
                    nama,
                    email,
                    divisi,
                    notelpon,
                    gender,
                    tanggal_lahir,
                    bio,
                    sosmed
                } = createProfileDto;
                const file = uploadeddFile.originalname;
                // Generate 10 kode unik
                const uniqueCode = randomBytes(5).toString('hex');
                const namefilee = `${uniqueCode}-${uploadeddFile.originalname}`;
                const updatedUploud = await this.profileService.updateUploud(
                    uploudData._id,
                    nama,
                    email,
                    divisi,
                    notelpon,
                    gender,
                    tanggal_lahir,
                    namefilee,
                    bio,
                    sosmed
                );
                const stream = require('stream');
                const readableStream = new stream.PassThrough();
                readableStream.end(uploadeddFile.buffer);
                const objectName = namefilee;
                await this.profileService.uploadFile('okr.profile', objectName, readableStream, uploadeddFile.mimetype);
                return Response.status(HttpStatus.OK).json({
                    message: 'Profil berhasil diperbarui',
                    updatedUploud
                });
            } else {
                // Jika uploadedFile kosong, hanya lakukan pembaruan profil
                const {
                    nama,
                    email,
                    divisi,
                    notelpon,
                    gender,
                    tanggal_lahir,
                    bio,
                    sosmed
                } = createProfileDto;
                const updatedUploud = await this.profileService.updateUploud(
                    uploudData._id,
                    nama,
                    email,
                    divisi,
                    notelpon,
                    gender,
                    tanggal_lahir,
                    uploudData.foto, // Gunakan nama file lama
                    bio,
                    sosmed
                );

                return Response.status(HttpStatus.OK).json({
                    message: 'Profil berhasil diperbarui (tanpa perubahan gambar)',
                    updatedUploud
                });
            }
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat memperbarui profil'
            });
        }
    }

    @Get('/all')
    async getUplouds(@Res() Response) {
        try {
            const profileData = await this.profileService.getAllProfile();
            return Response.status(HttpStatus.OK).json({
                message: 'Semua data profile berhasil di temukan', profileData
            });
        } catch (err) {
            return Response.status(err.status).json(err.Response);
        }
    }

    @Get('/get')
    async getProfileByIdAuth(@Headers() headers: Record<string, string>, @Param('id_user') id_auth: string) {
        try {
            const token = headers['authorization']?.split(' ')[1];
            if (!token) {
                return { message: 'Tidak ada token yang diberikan' };
            }

            // Dapatkan id_auth dari token
            const { id_user } = await this.authService.getUserFromToken(token);

            if (!id_user) {
                return { message: 'id_auth tidak valid' };
            }

            // Gunakan id_auth untuk mendapatkan profil
            const profile = await this.profileService.getProfileByIdAuth(id_user);

            if (!profile) {
                return { message: 'Profil tidak ditemukan' };
            }

            return profile;
        } catch (error) {
            console.error(`Error saat mengambil profil: ${error}`);
            throw new Error('Terjadi kesalahan saat mengambil profil');
        }
    }

    @Put('/role/:id')
    @UseGuards(AuthGuard())
    async updateRole(@Res() Response, @Param('id') profileId: string, @Body() createProfileDto: CreateProfileDto, @Req() Req) {
        try {
            const existingProfile = await this.profileService.updateRole(profileId, createProfileDto.role);
            return Response.status(HttpStatus.OK).json({
                message: 'Berhasil update role',
                existingProfile,
            });
            await this.profileService.updateCache();
        } catch (err) {
            console.error(`Error saat memperbarui role: ${err}`);
            throw new Error('Terjadi kesalahan saat memperbarui role');
        }
    }

    @Delete('/:id')
    @UseGuards(AuthGuard())
    async deleteProfile(@Res() Response, @Param('id') profileId: string) {
        try {
            // Dapatkan data uploud berdasarkan ID
            const deletedprofile = await this.profileService.deleteProfile(profileId);

            // Hapus objek dari Minio berdasarkan nama file
            if (deletedprofile) {
                await this.profileService.deleteFile('okr.profile', deletedprofile.foto);
            }

            // Update cache untuk data uploud
            await this.profileService.updateCache();
            await this.profileService.deleteCache(`001:${deletedprofile.id_user}`);

            return Response.status(HttpStatus.OK).json({
                message: 'Berhasil hapus data uploud',
                deletedprofile
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat menghapus data uploud'
            });
        }
    }

}
