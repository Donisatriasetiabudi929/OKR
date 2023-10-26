import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import { ObjektifService } from './objektif.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateObjektifDto } from 'src/dto/create.objektif.dto';
import { Response } from 'express';


@Controller('objektif')
export class ObjektifController {
    constructor(private readonly objektifService: ObjektifService) { }

    @Post()
    @UseGuards(AuthGuard())
    async createObjektif(@Res() res: Response, @Body() createObjektifDto: CreateObjektifDto) {
        try {
            const newObjektif = await this.objektifService.createObjektif(createObjektifDto);
            return res.status(HttpStatus.CREATED).json({
                message: "Berhasil menambahkan data objektif",
                newObjektif
            });
        } catch (err) {
            if (err.message === 'Objektif dengan nama tersebut sudah ada') {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 400,
                    message: "Error Objektif not created",
                    error: 'Objektif dengan nama tersebut sudah ada'
                });
            } else {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 400,
                    message: "Error objektif not created",
                    error: 'Bad request'
                });
            }
        }
    }

    @Put('/:id')
    //Untuk memanggil keamanan authorisasi auth
    @UseGuards(AuthGuard())
    async updateStudent(@Res() Response, @Param('id') objektifId: string,
        @Body() createObjektifDto: CreateObjektifDto) {
        //req Req untuk mengakses dan manipulasi informasi yang dikirimkan
        try {
            //Untuk menampilkan data user di console
            const existingObjektif = await this.objektifService.updateObjektif(objektifId, createObjektifDto);
            return Response.status(HttpStatus.OK).json({
                message: 'Objektif berhasil di update',
                existingObjektif
            });
        } catch (err) {
            return Response.status(err.status).json(err.Response);
        }
    }

    @Get()
    async getProjeks(@Res() Response) {
        try {
            const objekData = await this.objektifService.getAllObjek();
            return Response.status(HttpStatus.OK).json({
                message: 'Semua data objek berhasil ditemukan', objekData
            });
        } catch (err) {
            return Response.status(err.status).json(err.Response);
        }
    }

    @Get('/:id')
    async getProjekById(@Param('id') id: string, @Res() Response) {
        try {
            const objek = await this.objektifService.getObjek(id);

            if (!objek) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data objektif tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data objektif berhasil ditemukan',
                objek
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data objektif'
            });
        }
    }

    @Get('/projek/:id_projek')
    async getKeyresultsByProjekId(@Param('id_projek') idProjek: string, @Res() Response) {
        try {
            const objektif = await this.objektifService.getObjekByProjekId(idProjek);

            if (!objektif) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data objektif tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data objektif berhasil ditemukan',
                objektif
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data objektif'
            });
        }
    }

    @Delete('/:id')
@UseGuards(AuthGuard())
async deleteObjektif(@Param('id') objektifId: string, @Res() Response) {
    try {
        // Hapus Objektif berdasarkan ID
        await this.objektifService.deleteObjektif(objektifId);

        return Response.status(HttpStatus.OK).json({
            message: 'Berhasil hapus data Objektif'
        });
    } catch (err) {
        return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Terjadi kesalahan saat menghapus data Objektif'
        });
    }
}

@Get('/count/progres')
async getObjektifCountByStatusProgres(@Res() Response) {
    try {
        const status = "Progres";
        const count = await this.objektifService.getObjektifCountByStatus(status);

        return Response.status(HttpStatus.OK).json({
            message: `Jumlah objektif dengan status "${status}": ${count}`,
            count
        });
    } catch (err) {
        return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Terjadi kesalahan saat mengambil jumlah objektif'
        });
    }
}

@Get('/count/selesai')
async getObjektifCountByStatusSelesai(@Res() Response) {
    try {
        const status = "Selesai";
        const count = await this.objektifService.getObjektifCountByStatus(status);

        return Response.status(HttpStatus.OK).json({
            message: `Jumlah objektif dengan status "${status}": ${count}`,
            count
        });
    } catch (err) {
        return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Terjadi kesalahan saat mengambil jumlah objektif'
        });
    }
}

@Get('/count/projek/:idProjek')
async getObjektifCountByIdProjek(@Param('idProjek') idProjek: string, @Res() Response) {
    try {
        const count = await this.objektifService.getObjektifCountByIdProjek(idProjek);

        return Response.status(HttpStatus.OK).json({
            message: `Jumlah objektif dengan id_projek "${idProjek}": ${count}`,
            count
        });
    } catch (err) {
        return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Terjadi kesalahan saat mengambil jumlah objektif'
        });
    }
}

@Get('/count/projek/:idProjek/selesai')
async getKeyresultCountByIdProjekAndStatusDoni(@Param('idProjek') idProjek: string, @Res() Response) {
    try {
        const count = await this.objektifService.getObjektifCountByIdProjekBySelesai(idProjek);

        return Response.status(HttpStatus.OK).json({
            message: `Jumlah Objektif dengan status "Selesai" untuk projek ID "${idProjek}": ${count}`,
            count
        });
    } catch (err) {
        return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Terjadi kesalahan saat mengambil jumlah Objektif'
        });
    }
}



}
