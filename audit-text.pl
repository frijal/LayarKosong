#!/usr/bin/perl
use strict;
use warnings;
use File::Find;

my $target_dir = '.';
my $cari       = 'langkah yang sangat keliru';
my $ganti      = 'sangat keliru';

print "Memulai proses penggantian...\n";

find(sub {
    # Hanya proses file html/htm
    if (/\.html?$/) {
        # Pastikan file benar-benar ada dan bisa dibaca (mencegah error No such file)
        return unless -f $_ && -r $_;

        my $file = $File::Find::name;

        # Gunakan eval untuk menangkap error agar script tidak mati jika gagal
        eval {
            open(my $fh, '<', $_) or die "Gagal buka: $!";
            my $content = do { local $/; <$fh> };
            close($fh);

            if ($content =~ s/\Q$cari\E/$ganti/g) {
                open(my $out, '>', $_) or die "Gagal tulis: $!";
                print $out $content;
                close($out);
                print "Berhasil diperbarui: $file\n";
            }
        };
        if ($@) {
            warn "Melewati $file karena error: $@";
        }
    }
}, $target_dir);

print "Proses selesai.\n";
