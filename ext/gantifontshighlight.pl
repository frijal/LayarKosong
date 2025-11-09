#!/usr/bin/env perl
use strict;
use warnings;
use File::Copy qw(copy);
use Getopt::Long;

# ===============================
# 🧩 Opsi CLI
# ===============================
my $quiet = 0;
my $no_backup = 0;

GetOptions(
  "quiet"      => \$quiet,
  "no-backup"  => \$no_backup,
);

# ===============================
# 🔁 Peta penggantian CDN → lokal
# ===============================
my %REPLACEMENTS = (
  # --- Font Awesome (semua CDN, semua versi)
  qr{href=["']https://(?:cdnjs\.cloudflare\.com/ajax/libs|cdn\.jsdelivr\.net/npm/\@fortawesome/fontawesome-free\@[^/]+|use\.fontawesome\.com/releases/v[\d\.]+)/css/all\.min\.css["'][^>]*}i
    => 'href="/ext/fontawesome.css"',

  # --- Highlight.js JS (semua sumber)
  qr{src=["']https://(?:cdnjs\.cloudflare\.com/ajax/libs/highlight\.js|cdn\.jsdelivr\.net/(?:npm/highlight\.js\@[^/]+|gh/highlightjs/cdn-release\@[^/]+/build))/highlight\.min\.js["'][^>]*}i
    => 'src="/ext/highlight.js"',

  # --- Highlight.js CSS (tema terang)
  qr{href=["']https://(?:cdnjs\.cloudflare\.com/ajax/libs/highlight\.js|cdn\.jsdelivr\.net/(?:npm/highlight\.js\@[^/]+|gh/highlightjs/cdn-release\@[^/]+/build))/styles/github\.min\.css["'][^>]*}i
    => 'href="/ext/github.min.css"',

  # --- Highlight.js CSS (tema gelap)
  qr{href=["']https://(?:cdnjs\.cloudflare\.com/ajax/libs/highlight\.js|cdn\.jsdelivr\.net/(?:npm/highlight\.js\@[^/]+|gh/highlightjs/cdn-release\@[^/]+/build))/styles/github-dark\.min\.css["'][^>]*}i
    => 'href="/ext/github-dark.min.css"',

  # --- Highlight.js CSS default (misalnya default.min.css)
  qr{href=["']https://(?:cdnjs\.cloudflare\.com/ajax/libs/highlight\.js|cdn\.jsdelivr\.net/(?:npm/highlight\.js\@[^/]+|gh/highlightjs/cdn-release\@[^/]+/build))/styles/default\.min\.css["'][^>]*}i
    => 'href="/ext/github-dark.min.css"',
);

# ===============================
# 📁 Cari file HTML
# ===============================
my @files = glob("*.html artikelx/*.html artikel/*.html");

if (!@files) {
  print "⚠️  Tidak ada file HTML ditemukan.\n" unless $quiet;
  exit 0;
}

foreach my $file (@files) {
  local $/ = undef;
  open my $fh, "<:utf8", $file or next;
  my $content = <$fh>;
  close $fh;

  my $changed = 0;

  while (my ($regex, $replacement) = each %REPLACEMENTS) {
    my $count = ($content =~ s/$regex/$replacement/gi);
    $changed += $count if $count;
  }

  if ($changed > 0) {
    unless ($no_backup) {
      copy($file, "$file.bak");
      print "🗂️  Backup dibuat: $file.bak\n" unless $quiet;
    }

    open my $out, ">:utf8", $file or next;
    print $out $content;
    close $out;

    print "✅ $file — $changed tautan CDN diganti ke /ext lokal\n" unless $quiet;
  } else {
    print "⏭️  Tidak ada penggantian di $file\n" unless $quiet;
  }
}

print "🎯 Selesai. Semua CDN kini diarahkan ke aset lokal.\n" unless $quiet;
