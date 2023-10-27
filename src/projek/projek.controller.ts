import { Body, Controller, Delete, Get, HttpStatus, NotFoundException, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateProjekDto } from 'src/dto/create.projek.dto';
import { ProjekService } from './projek.service';

@Controller('projek')
export class ProjekController {
    constructor(private readonly projekService: ProjekService) { }


    @Post()
    @UseGuards(AuthGuard())
    async createProjek(
        @Res() Response,
        @Body() createProjekDto: CreateProjekDto,
    ) {
        try {
            const modifiedDto = {
                ...createProjekDto,
                team: createProjekDto.team || []
            };

            const newProjek = await this.projekService.createProjek(modifiedDto);
            return Response.status(HttpStatus.CREATED).json({
                message: "Berhasil menambahkan data projek",
                newProjek
            });

        } catch (err) {
            if (err.message === 'Projek dengan nama tersebut sudah ada') {
                return Response.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 400,
                    message: "Error Project not created",
                    error: 'Projek dengan nama tersebut sudah ada'
                });
            } else if (err.message === 'Data team tidak boleh sama') {
                return Response.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 400,
                    message: "Error projek not created",
                    error: 'Data team tidak boleh sama'
                });
            } else {
                return Response.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 400,
                    message: "Error projek not created",
                    error: 'Bad request'
                });
            }
        }
    }




    @Get()
    async getProjeks(@Res() Response) {
        try {
            const projekData = await this.projekService.getAllProjek();
            return Response.status(HttpStatus.OK).json({
                message: 'Semua data projek berhasil ditemukan', projekData
            });
        } catch (err) {
            return Response.status(err.status).json(err.Response);
        }
    }

    @Get('/:id')
    async getProjekById(@Param('id') id: string, @Res() Response) {
        try {
            const projek = await this.projekService.getProjek(id);

            if (!projek) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data projek tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data projek berhasil ditemukan',
                projek
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data projek'
            });
        }
    }

    @Put(':id')
    @UseGuards(AuthGuard())
    async updateProjek(@Res() res, @Param('id') projekId: string, @Body() updateProjekDto: CreateProjekDto) {
        try {
            const updatedProjek = await this.projekService.updateProjek(projekId, updateProjekDto);

            return res.status(HttpStatus.OK).json({
                message: `Projek dengan ID ${projekId} berhasil diperbarui.`,
                updatedProjek,
            });
            await this.projekService.updateCache();
        } catch (err) {
            if (err instanceof NotFoundException) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    message: err.message,
                });
            } else {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Gagal memperbarui projek.',
                });
            }
        }
    }

    @Delete('/:id')
    @UseGuards(AuthGuard())
    async deleteObjektif(@Param('id') projekId: string, @Res() Response) {
        try {
            await this.projekService.deleteProjek(projekId);
            await this.projekService.deleteCache(`002`);
            return Response.status(HttpStatus.OK).json({
                message: 'Berhasil hapus data projek'
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat menghapus data projek'
            });
        }
    }
    @Get('/status/draft')
    async getAllProjekDraft(@Res() Response) {
        try {
            const draftprojek = await this.projekService.getAllProjekByStatusDraft();

            if (!draftprojek) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Tidak ada data Progres task dengan status \'draft\' ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data Progres task dengan status \'draft\' berhasil ditemukan',
                draftprojek
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data Progres task dengan status \'draft\''
            });
        }
    }

    @Get('/non/draft')
    async getAllProjekNonDraft(@Res() Response) {
        try {
            const draftprojek = await this.projekService.GetAllProjekSelainDraft();

            if (!draftprojek) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Tidak ada data Progres task dengan status \'draft\' ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data Progres task dengan status \'draft\' berhasil ditemukan',
                draftprojek
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data Progres task dengan status \'draft\''
            });
        }
    }

    @Put('/status/:id_projek/draft')
    @UseGuards(AuthGuard())
    async approveProgres(
        @Param('id_projek') id_projek: string,
    ): Promise<any> {
        try {
            const updateProjekStatus = await this.projekService.moveDraftStatus(id_projek);
            return { message: 'projek berhasil mengubah status ke Draft', updateProjekStatus };
        } catch (error) {
            console.error(`Error saat mengubah status ke Draft: ${error}`);
            throw new Error('Terjadi kesalahan saat mengubah status ke Draft');
        }
    }

    @Put('/status/:id_projek/cancel')
    @UseGuards(AuthGuard())
    async CanceledProgres(
        @Param('id_projek') id_projek: string,
    ): Promise<any> {
        try {
            const updateProjekStatus = await this.projekService.canceledProjek(id_projek);
            return { message: 'projek berhasil mengubah status ke Cancel', updateProjekStatus };
        } catch (error) {
            console.error(`Error saat mengubah status ke Cancel: ${error}`);
            throw new Error('Terjadi kesalahan saat mengubah status ke Cancel');
        }
    }

    @Put('/public/:id_projek/up')
    @UseGuards(AuthGuard())
    async statusProjek(
        @Param('id_projek') id_projek: string,
    ): Promise<any> {
        try {
            const updatestatusprojek = await this.projekService.moveRealStatusProjek(id_projek);

            return { message: 'projek berhasil Di UP', updatestatusprojek };
        } catch (error) {
            console.error(`Error saat UP projek: ${error}`);
            throw new Error('Terjadi kesalahan saat UP projek');
        }
    }

    @Get('/count/jumlah')
    async getProjekCount(@Res() Response) {
        try {
            const count = await this.projekService.getProjekCount();
            return Response.status(HttpStatus.OK).json({
                message: `Jumlah projek: ${count}`,
                count
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil jumlah projek'
            });
        }
    }



}
