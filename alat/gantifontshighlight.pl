#!/usr/bin/env perl
use strict;
use warnings;
use utf8;
use Getopt::Long;
use File::Copy qw(copy);

## ⚙️ CLI OPTIONS
my $quiet       = 0;
my $no_backup   = 0;
my $dry_run     = 0;
GetOptions(
  "quiet"     => \$quiet,
  "no-backup"   => \$no_backup,
  "dry-run"     => \$dry_run,
) or die "Usage: $0 [--quiet] [--no-backup] [--dry-run]\n";

## 📂 FILES TO SCAN
my @files = glob("*.html artikelx/*.html artikel/*.html");
unless (@files) {
  print "⚠️ Tidak ada file HTML ditemukan.\n" unless $quiet;
  exit 0;
}

## 🗺️ REPLACEMENT MAP
# Map: url-regex => replacement-path
my @MAP = (
  # --- PRISM CSS (Berbagai Tema) ---
  { rx => qr{https://.*/prism-vsc-dark-plus\.min\.css}i, repl => '/ext/vs-dark.min.css' },
  { rx => qr{https://.*/prism-tomorrow\.min\.css}i, repl => '/ext/prism-tomorrow.min.css' },
  { rx => qr{https://.*/prism-twilight\.min\.css}i, repl => '/ext/vs-dark.min.css' },
  { rx => qr{https://.*/prism-okaidia\.min\.css}i, repl => '/ext/monokai.min.css' },
  { rx => qr{https://.*/prism-one-dark\.min\.css}i, repl => '/ext/atom-one-dark.min.css' },
  { rx => qr{https://.*/prism-one-light\.min\.css}i, repl => '/ext/atom-one-light.min.css' },
  { rx => qr{https://.*/prism-coy\.min\.css}i, repl => '/ext/default.min.css' },
  { rx => qr{https://.*/prism(-toolbar)?\.?min?\.css}i, repl => '/ext/default.min.css' },

  # --- FONT AWESOME ---
  { rx => qr{https://.*/all(\.min)?\.css}i, repl => '/ext/fontawesome.css' },
  { rx => qr{https://use\.fontawesome\.com/releases/v[\d\.\-a-z]+/css/all\.css}i, repl => '/ext/fontawesome.css' },

  # --- LEAFLET & MAPS ---
  { rx => qr{https://.*/leaflet\.css}i, repl => '/ext/leaflet.css' },

  # --- HIGHLIGHT.JS (JS & CSS) ---
  { rx => qr{https://.*/highlight\.min\.js}i, repl => '/ext/highlight.js' },
  { rx => qr{https://.*/styles/github(-dark)?\.min\.css}i, repl => '/ext/github-dark.min.css' },
  { rx => qr{https://.*/styles/default\.min\.css}i, repl => '/ext/default.min.css' },
);

## 🔄 FUNCTION: URL Replacement
sub replace_urls_in_string {
  my ($text_ref) = @_;
  my $count = 0;

  foreach my $m (@MAP) {
    my $rx    = $m->{rx};
    my $repl  = $m->{repl};

    # Regex ini menangkap href/src dengan kutip tunggal atau ganda
    while ( $$text_ref =~ s{
      (\b(?:href|src)\b)      # $1: atribut
      (\s*=\s*)               # $2: equals
      (['"])                  # $3: quote pembuka
      \s*
      ($rx)                   # $4: URL yang cocok
      \s*
      \3                      # quote penutup
      }{
        $1 . $2 . $3 . $repl . $3;
      }gexsi
    ) { $count++; }
  }

  return $count;
}

## 🧹 FUNCTION: Attribute Cleaning
sub clean_attributes {
    my ($content_ref) = @_;
    my $clean_count = 0;

    # Menghapus sampah atribut yang biasanya menyertai CDN (integrity, dsb)
    while ( $$content_ref =~ s{
      \s+
      (?:
        integrity \s*=\s* (['"])[^'"]*?\1 |
        crossorigin \s*=\s* (['"])[^'"]*?\2 |
        referrertarget \s*=\s* (['"])[^'"]*?\3 | # typo umum
        referrerpolicy \s*=\s* (['"])[^'"]*?\4 |
        crossorigin |
        referrerpolicy
      )
    }{}gxsi
    ) { $clean_count++; }

    return $clean_count;
}

## 📝 MAIN PROCESSING
my $total_files_changed = 0;
my $total_replacements  = 0;
my $total_cleaned       = 0;

foreach my $file (@files) {
  next unless -f $file;

  # Skip index.html demi keamanan struktur navigasi
  if ($file =~ /index\.html$/i) {
      print "⏭️ Proteksi: Melewati $file\n" unless $quiet;
      next;
  }

  local $/ = undef;
  open my $in, '<:raw', $file or do { warn "⚠️ Gagal buka $file: $!\n"; next; };
  my $content = <$in>;
  close $in;

  my $replaced = replace_urls_in_string(\$content);
  my $cleaned  = 0;

  if ($replaced) {
    # Hanya bersihkan atribut jika ada URL yang diganti agar tidak agresif
    $cleaned = clean_attributes(\$content);
  }

  if ($replaced || $cleaned) {
    $total_files_changed++;
    $total_replacements += $replaced;
    $total_cleaned += $cleaned;

    my $summary = "($replaced ganti, $cleaned atribut dihapus)";

    if ($dry_run) {
      print "🧪 [DRY-RUN] $file -> $summary\n" unless $quiet;
      next;
    }

    unless ($no_backup) {
      copy($file, "$file.bak");
    }

    open my $out, '>:raw', $file or do { warn "⚠️ Gagal tulis $file: $!\n"; next; };
    print $out $content;
    close $out;

    print "✅ Sukses: $file $summary\n" unless $quiet;
  }
}

print "\n🎯 Selesai! $total_files_changed file diperbarui. Total URL: $total_replacements, Atribut dibersihkan: $total_cleaned.\n" unless $quiet;
exit 0;