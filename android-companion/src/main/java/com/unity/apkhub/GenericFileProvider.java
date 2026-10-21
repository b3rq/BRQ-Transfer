package com.unity.apkhub;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

public class GenericFileProvider extends ContentProvider {
    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (!"r".equals(mode)) throw new FileNotFoundException("Yalnız okuma destekleniyor");
        File file = findFile(uri);
        if (file != null && file.exists()) {
            return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
        }
        throw new FileNotFoundException("Dosya bulunamadı: " + uri.toString());
    }

    private File findFile(Uri uri) {
        String name = uri.getLastPathSegment();
        if (name == null || !name.matches("download-[a-zA-Z0-9-]+\\.apk")) return null;
        for (File root : new File[] { getContext().getExternalFilesDir(null), getContext().getCacheDir() }) {
            if (root == null) continue;
            try {
                File file = new File(root, name).getCanonicalFile();
                if (root.getCanonicalFile().equals(file.getParentFile()) && file.isFile()) return file;
            } catch (java.io.IOException ignored) { }
        }
        return null;
    }

    @Override
    public String getType(Uri uri) {
        return "application/vnd.android.package-archive";
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File file = findFile(uri);
        if (projection == null) {
            projection = new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE };
        }
        MatrixCursor cursor = new MatrixCursor(projection);
        if (file != null && file.exists()) {
            Object[] row = new Object[projection.length];
            for (int i = 0; i < projection.length; i++) {
                if (OpenableColumns.DISPLAY_NAME.equals(projection[i])) {
                    row[i] = file.getName();
                } else if (OpenableColumns.SIZE.equals(projection[i])) {
                    row[i] = file.length();
                }
            }
            cursor.addRow(row);
        }
        return cursor;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) { return null; }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) { return 0; }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) { return 0; }
}
