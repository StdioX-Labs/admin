import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const S3_ACCESS_KEY = '62f302ee2a6bdec56870da3b3a3e7127';
const S3_SECRET_KEY = '03d389951f566e189c3ce0e7c54d122c';
const S3_ENDPOINT = 'https://eu2.contabostorage.com';
const S3_BUCKET_NAME = 'bv-kenya';
const S3_BUCKET_FULL = 'b418dbb4d7c942e5b311c172a41d1db8:bv-kenya';
const S3_REGION = 'eu-central-1';

const s3Client = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
  forcePathStyle: true,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const extension = file.name.split('.').pop();
    const objectKey = `events/${timestamp}-${randomStr}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: objectKey,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read',
    }));

    return NextResponse.json({
      success: true,
      url: `${S3_ENDPOINT}/${S3_BUCKET_FULL}/${objectKey}`,
    });
  } catch (error) {
    console.error('Contabo upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
