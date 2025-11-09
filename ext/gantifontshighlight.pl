#!/usr/bin/perl
use strict;
use warnings;
use utf8;
use Getopt::Long;
use File::Copy qw(copy);
use File::Find;
use Digest::SHA qw(sha256_hex);

# ============================================
# 🧠 Konfigurasi & Argumen CLI
# ============================================
my $base_dir   = '.';
my $backup_ext = '.bak';
my $dry_run    = 0;
my $no_backup  = 0;
my $verbose    = 0;
my $quiet      = 0;

GetOptions(
    'dry-run'   => \$dry_run,
    'no-backup' => \$no_backup,
    'verbose'   => \$verbose,
    'quiet'     => \$quiet,
) or die "Gunakan: $0 [--dry-run] [--no-backup] [--verbose] [--quiet]\n";

# ============================================
# 📁 Lokasi aset lokal
# ============================================
my $font_dir     = 'ext/fontawesome-webfonts';
my $css_fa_local = '/ext/fontawesome.css';
my $js_hl_local  = '/ext/highlight.js';
my $css_hl_light = '/ext/github.min.css';
my $css_hl_dark  = '/ext/github-dark.min.css';

# ============================================
# 🔁 Daftar pola penggantian CDN → lokal
# ============================================
my %REPLACEMENTS = (
    # Font Awesome
    qr{https://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/[\d\.]+/css/all\.min\.css} => $css_fa_local,
    qr{https://cdn\.jsdelivr\.net/npm/\@fortawesome/fontawesome-free@[^/]+/css/all\.min\.css} => $css_fa_local,
    qr{https://use\.fontawesome\.com/releases/v[\d\.]+/css/all\.css} => $css_fa_local,

    # Highlight.js (JS)
    qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release@.*/build/highlight\.min\.js} => $js_hl_local,
    qr{https://cdn\.jsdelivr\.net/npm/highlight\.js@[^/]+/highlight\.min\.js} => $js_hl_local,
    qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/.*/highlight\.min\.js} => $js_hl_local,

    # Highlight.js (CSS Default)
    qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/.*/styles/default\.min\.css} => $css_hl_light,
    qr{https://cdn\.jsdelivr\.net/npm/highlight\.js@[^/]+/styles/default\.min\.css} => $css_hl_light,
    qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release@.*/build/styles/default\.min\.css} => $css_hl_light,

    # Highlight.js (CSS Light)
    qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release@.*/build/styles/github\.min\.css} => $css_hl_light,
    qr{https://cdn\.jsdelivr\.net/npm/highlight\.js@[^/]+/styles/github\.min\.css} => $css_hl_light,
    qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/.*/styles/github\.min\.css} => $css_hl_light,

    # Highlight.js (CSS Dark)
    qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release@.*/build/styles/github-dark\.min\.css} => $css_hl_dark,
    qr{https://cdn\.jsdelivr\.net/npm/highlight\.js@[^/]+/styles/github-dark\.min\.css} => $css_hl_dark,
    qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/.*/styles/github-dark\.min\.css} => $css_hl_dark,
);

# ============================================
# 🧾 Fungsi bantu
# ============================================
sub human_size {
    my $bytes = shift;
    return sprintf("%.1f KB", $bytes / 1024) if $bytes < 1048576;
    return sprintf("%.2f MB", $bytes / 1048576);
}

# ============================================
# 📦 Daftar file font (hanya jika tidak quiet)
# ============================================
unless ($quiet) {
    print "📦 Daftar file font di $font_dir:\n";
    if (-d $font_dir) {
        find(
            sub {
                return unless /\.woff2?$/;
                my $file = $File::Find::name;
                my $size = -s $file;
                open my $fh, '<:raw', $file or return;
                my $sha = sha256_hex(do { local $/; <$fh> });
                close $fh;
                printf("  • %s — %s — SHA256: %.12s…\n", $file, human_size($size), $sha);
            },
            $font_dir
        );
    } else {
        print "⚠️  Direktori font tidak ditemukan: $font_dir\n";
    }
    print "\n";
}

# ============================================
# 🔧 Proses file HTML
# ============================================
find(\&process_html, $base_dir);

sub process_html {
    return unless -f $_;
    return unless /\.html?$/i;

    my $file = $File::Find::name;
    open my $in, '<:encoding(UTF-8)', $file or do { warn "⚠️ Gagal baca $file: $!"; return; };
    local $/;
    my $html = <$in>;
    close $in;

    my $changed = 0;
    for my $pattern (keys %REPLACEMENTS) {
        my $replacement = $REPLACEMENTS{$pattern};
        my $num = ($html =~ s{$pattern}{$replacement}g);
        $changed += $num;
        print "🔁 $file — $num penggantian ke $replacement\n" if $verbose && $num > 0;
    }

    if ($changed > 0) {
        if ($dry_run) {
            print "🧪 [DRY RUN] Akan mengganti $changed tautan di: $file\n" unless $quiet;
            return;
        }

        unless ($no_backup) {
            my $backup = "$file$backup_ext";
            copy($file, $backup) or warn "⚠️ Gagal backup $file: $!";
            print "🗂️  Backup dibuat: $backup\n" if $verbose;
        }

        open my $out, '>:encoding(UTF-8)', $file or do { warn "⚠️ Gagal tulis $file: $!"; return; };
        print $out $html;
        close $out;

        print "✅ Diperbarui: $file ($changed tautan diganti)\n" unless $quiet;
    }
}

print "\n🎯 Selesai! Semua CDN kini diarahkan ke /ext lokal\n" unless $quiet;
exit 0;
