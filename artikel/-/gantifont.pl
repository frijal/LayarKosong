#!/usr/bin/perl
use strict;
use warnings;
use File::Find;
use File::Copy;

# Folder target — ubah jika ingin scan di direktori lain
my $dir = '.';

find(\&process_file, $dir);

sub process_file {
    return unless -f $_;              # hanya file biasa
    return unless /\.html?$/i;        # hanya file .html atau .htm

    my $file = $File::Find::name;

    open my $in,  '<', $file or do { warn "Gagal buka $file: $!"; return; };
    my @lines = <$in>;
    close $in;

    my $changed = 0;

    for (@lines) {
        # Deteksi seluruh versi Font Awesome di CDNJS
        if (m{https://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/[\d\.]+/css/all\.min\.css}) {
            s{<link\s+[^>]*href="https://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/[\d\.]+/css/all\.min\.css"[^>]*>}
             {<link rel="stylesheet" href="/ext/fontawesome.css">};
            $changed = 1;
        }
    }

    if ($changed) {
        # Buat backup sebelum menulis ulang
        my $backup = "$file.bak";
        if (copy($file, $backup)) {
            print "🗂️  Backup dibuat: $backup\n";
        } else {
            warn "⚠️  Gagal membuat backup untuk $file: $!";
        }

        open my $out, '>', $file or do { warn "Gagal tulis $file: $!"; return; };
        print $out @lines;
        close $out;

        print "✅ Diperbarui: $file\n";
    }
}
