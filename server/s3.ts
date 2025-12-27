import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const bucketName = process.env.AWS_S3_BUCKET || "";

export async function uploadToS3(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = "uploads"
): Promise<{ url: string; key: string } | null> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
    console.log("[DEV MODE] S3 not configured, simulating upload:", fileName);
    const mockKey = `${folder}/${randomUUID()}-${fileName}`;
    return { url: `/api/files/${mockKey}`, key: mockKey };
  }

  try {
    const key = `${folder}/${randomUUID()}-${fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    );

    const url = `https://${bucketName}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;
    return { url, key };
  } catch (error) {
    console.error("S3 upload failed:", error);
    return null;
  }
}

export async function deleteFromS3(key: string): Promise<boolean> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
    console.log("[DEV MODE] S3 not configured, simulating delete:", key);
    return true;
  }

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error("S3 delete failed:", error);
    return false;
  }
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string | null> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
    return `/api/files/${key}`;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("Failed to generate signed URL:", error);
    return null;
  }
}

export async function getSignedUploadUrl(
  fileName: string,
  contentType: string,
  folder: string = "uploads"
): Promise<{ uploadUrl: string; key: string; publicUrl: string } | null> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
    const mockKey = `${folder}/${randomUUID()}-${fileName}`;
    return {
      uploadUrl: `/api/upload-mock`,
      key: mockKey,
      publicUrl: `/api/files/${mockKey}`,
    };
  }

  try {
    const key = `${folder}/${randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;

    return { uploadUrl, key, publicUrl };
  } catch (error) {
    console.error("Failed to generate upload URL:", error);
    return null;
  }
}
