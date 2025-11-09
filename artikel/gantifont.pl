#!/usr/bin/perl
use strict;
use warnings;
use File::Find;
use File::Copy;
use utf8;
binmode(STDOUT, ':utf8');


my $dir = '.';
my $restore = 0;

if (@ARGV && $ARGV[0] eq '--restore') {
    $restore = 1;
}

if ($restore) {
    print "♻️  Mode pemulihan aktif — mengembalikan semua .bak...\n";
    find(\&restore_file, $dir);
    exit;
}

find(\&process_file, $dir);

sub process_file {
    return unless -f $_;
    return unless /\.html?$/i;

    my $file = $File::Find::name;
    open my $in, '<', $file or do { warn "Gagal buka $file: $!"; return; };
    binmode($in, ':utf8');
    local $/;  # baca seluruh isi file
    my $content = <$in>;
    close $in;

    my $original = $content;

    # Regex pintar: ganti seluruh <link ...> multiline yang mengandung Font Awesome CDNJS
    $content =~ s{
        <link            # Awal tag
        [^>]*?           # Atribut apapun
        href\s*=\s*["']https://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/[\d\.]+/css/all\.min\.css["'] # URL target
        [^>]*?>          # Atribut sisanya
    }{<link rel="stylesheet" href="/ext/fontawesome.css">}gix;

    if ($content ne $original) {
        my $backup = "$file.bak";
        if (copy($file, $backup)) {
            print "🗂️  Backup dibuat: $backup\n";
        } else {
            warn "⚠️  Gagal membuat backup untuk $file: $!";
        }

        open my $out, '>', $file or do { warn "Gagal tulis $file: $!"; return; };
        binmode($out, ':utf8');
        print $out $content;
        close $out;

        print "✅ Font Awesome CDN diganti di: $file\n";
    }
}

sub restore_file {
    return unless /\.bak$/i;
    my $bak = $File::Find::name;
    (my $orig = $bak) =~ s/\.bak$//;
    if (-f $orig) {
        move($bak, $orig) or warn "⚠️  Gagal restore $orig: $!";
        print "♻️  Dipulihkan: $orig\n";
    }
}

