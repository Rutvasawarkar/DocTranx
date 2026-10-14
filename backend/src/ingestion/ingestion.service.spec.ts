import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EventsService } from '../events/events.service';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

describe('IngestionService', () => {
  let service: IngestionService;

  const mockPrismaService = {
    document: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    documentMetadata: {
      createMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
  };

  const mockEventsService = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: EventsService, useValue: mockEventsService },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ingestDocument', () => {
    const mockFile = {
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test pdf content'),
    } as Express.Multer.File;

    const mockDto = {
      title: 'Test Document',
      tags: ['test'],
    };

    it('should reject unsupported MIME types', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/zip',
      } as Express.Multer.File;

      await expect(
        service.ingestDocument(invalidFile, mockDto, 'user-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding max size', async () => {
      const largeFile = {
        ...mockFile,
        size: 600 * 1024 * 1024, // 600MB
      } as Express.Multer.File;

      await expect(
        service.ingestDocument(largeFile, mockDto, 'user-1', 'tenant-1'),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('should successfully ingest a valid PDF', async () => {
      mockPrismaService.document.create.mockResolvedValue({
        id: 'doc-uuid',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: BigInt(1024),
        checksum: 'abc123',
        filePath: 'uploads/tenant-1/doc-uuid/test.pdf',
        status: 'UPLOADED',
        tenantId: 'tenant-1',
        uploadedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockStorageService.uploadFile.mockResolvedValue(undefined);
      mockPrismaService.documentMetadata.createMany.mockResolvedValue({ count: 3 });
      mockPrismaService.auditLog.create.mockResolvedValue({});
      mockEventsService.publish.mockResolvedValue(undefined);

      const result = await service.ingestDocument(
        mockFile,
        mockDto,
        'user-1',
        'tenant-1',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('doc-uuid');
      expect(result.fileName).toBe('test.pdf');
      expect(result.status).toBe('UPLOADED');
      expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(1);
      expect(mockEventsService.publish).toHaveBeenCalledTimes(1);
    });
  });
});
