#!/usr/bin/perl
use strict;
use warnings;
use utf8;
use File::Copy qw(copy);
use File::Find;

# ============================================
# ⚙️  Opsi CLI
# ============================================
my $base_dir   = '.';
my $backup_ext = '.bak';
my $no_backup  = 0;
my $quiet      = 0;

for (@ARGV) {
    $no_backup = 1 if $_ eq '--no-backup';
    $quiet     = 1 if $_ eq '--quiet';
}

# ============================================
# 📁 Path Lokal
# ============================================
my $font_dir     = 'ext/fontawesome-webfonts';
my $css_fa_local = '/ext/fontawesome.css';
my $js_hl_local  = '/ext/highlight.js';
my $css_hl_light = '/ext/github.min.css';
my $css_hl_dark  = '/ext/github-dark.min.css';

# ============================================
# 🔁 Daftar pola penggantian CDN → Lokal
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
# 🔍 Proses semua file HTML
# ============================================
my $total_changed = 0;
my $total_files   = 0;
find(\&process_html, $base_dir);

sub process_html {
    return unless -f $_;
    return unless /\.html?$/i;
    $total_files++;

    my $file = $File::Find::name;
    open my $in, '<:encoding(UTF-8)', $file or do {
        print "⚠️ Gagal baca $file: $!\n" unless $quiet;
        return;
    };
    local $/;
    my $html = <$in>;
    close $in;

    my $changed = 0;
    for my $pattern (keys %REPLACEMENTS) {
        my $replacement = $REPLACEMENTS{$pattern};
        my $num = ($html =~ s{$pattern}{$replacement}g);
        $changed += $num if $num > 0;
    }

    if ($changed > 0) {
        $total_changed += $changed;

        unless ($no_backup) {
            my $backup = "$file$backup_ext";
            if (copy($file, $backup)) {
                print "🗂️  Backup dibuat: $backup\n" unless $quiet;
            } else {
                print "⚠️  Gagal backup $file: $!\n" unless $quiet;
            }
        }

        open my $out, '>:encoding(UTF-8)', $file or do {
            print "⚠️ Gagal tulis $file: $!\n" unless $quiet;
            return;
        };
        print $out $html;
        close $out;

        print "✅ Diperbarui: $file ($changed tautan diganti)\n" unless $quiet;
    }
}

print "\n🎯 Selesai! $total_files file diperiksa, $total_changed tautan diganti ke lokal\n"
  unless $quiet;
