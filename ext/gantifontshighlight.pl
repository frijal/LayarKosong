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
# files to scan (default)
my @files = glob("*.html artikelx/*.html artikel/*.html");
unless (@files) {
  print "⚠️ Tidak ada file HTML ditemukan.\n" unless $quiet;
  exit 0;
}

## 🗺️ REPLACEMENT MAP
# Map: url-regex => replacement-path
# NOTE: Regexes updated for better version matching (e.g., v6.0.0-beta3) and replacement strings are clean.
my @MAP = (
  # Font Awesome CSS (Updated: [\d\.\-a-z]+)
  { rx => qr{https://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/[\d\.\-a-z]+/css/all\.min\.css}i, repl => '/ext/fontawesome.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/npm/\@fortawesome/fontawesome-free\@[^/]+/css/all\.min\.css}i, repl => '/ext/fontawesome.css' },
  { rx => qr{https://use\.fontawesome\.com/releases/v[\d\.\-a-z]+/css/all\.css}i, repl => '/ext/fontawesome.css' },

  # Highlight.js JS (Updated: [\d\.\-a-z]+)
  { rx => qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[\d\.\-a-z]+/highlight\.min\.js}i, repl => '/ext/highlight.js' },
  { rx => qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release\@[^/]+/build/highlight\.min\.js}i, repl => '/ext/highlight.js' },
  { rx => qr{https://cdn\.jsdelivr\.net/npm/highlight\.js\@[^/]+/highlight\.min\.js}i, repl => '/ext/highlight.js' },

  # Highlight.js CSS - default (Updated: [\d\.\-a-z]+)
  { rx => qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[\d\.\-a-z]+/styles/default\.min\.css}i, repl => '/ext/default.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release\@[^/]+/build/styles/default\.min\.css}i, repl => '/ext/default.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/npm/highlight\.js\@[^/]+/styles/default\.min\.css}i, repl => '/ext/default.min.css' },

  # Highlight.js CSS - github (Updated: [\d\.\-a-z]+)
  { rx => qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[\d\.\-a-z]+/styles/github\.min\.css}i, repl => '/ext/github.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release\@[^/]+/build/styles/github\.min\.css}i, repl => '/ext/github.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/npm/highlight\.js\@[^/]+/styles/github\.min\.css}i, repl => '/ext/github.min.css' },

  # Highlight.js CSS - github-dark (Updated: [\d\.\-a-z]+)
  { rx => qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[\d\.\-a-z]+/styles/github-dark\.min\.css}i, repl => '/ext/github-dark.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release\@[^/]+/build/styles/github-dark\.min\.css}i, repl => '/ext/github-dark.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/npm/highlight\.js\@[^/]+/styles/github-dark\.min\.css}i, repl => '/ext/github-dark.min.css' },
);

## 🔄 FUNCTION: URL Replacement
sub replace_urls_in_string {
  my ($text_ref) = @_;
  my $count = 0;

  foreach my $m (@MAP) {
    my $rx    = $m->{rx};
    my $repl  = $m->{repl};

    # Replace only inside href="..." or src='...'
    while ( $$text_ref =~ s{
      (\b(?:href|src)\b)       # $1 = attribute name
      (\s*=\s*)                # $2 = equals + spaces
      (['"])                   # $3 = quote
      \s* # optional space
      ($rx)                    # $4 = matched URL
      \s* # optional space
      \3                       # closing quote
      }{
        my ($attr,$eq,$q) = ($1,$2,$3);
        $attr . $eq . $q . $repl . $q; # Replace URL with local path
      }gexsi
    ) { $count++; }
  }

  return $count;
}

## 🧹 FUNCTION: Attribute Cleaning (NEW)
sub clean_attributes {
    my ($content_ref) = @_;
    my $clean_count = 0;

    # Regex untuk menghapus atribut integrity, crossorigin, atau referrerpolicy, dengan atau tanpa nilai
    while ( $$content_ref =~ s{
      \s+ # Match one or more leading spaces
      (?:
        integrity \s*=\s* (['"])[^'"]*?\1 | # integrity="value"
        crossorigin \s*=\s* (['"])[^'"]*?\2 | # crossorigin="value"
        referrerpolicy \s*=\s* (['"])[^'"]*?\3 | # referrerpolicy="value"
        crossorigin | # Standalone crossorigin (e.g. <img crossorigin>)
        referrerpolicy # Standalone referrerpolicy
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
  local $/ = undef;
  
  # Read file
  open my $in, '<:raw', $file or do { warn "⚠️ Failed open $file: $!\n"; next; };
  my $content = <$in>;
  close $in;

  # 1. URL Replacement
  my $replaced = replace_urls_in_string(\$content);
  my $cleaned  = 0;

  if ($replaced) {
    # 2. Attribute Cleaning (only if URL was replaced)
    $cleaned = clean_attributes(\$content);
  }

  if ($replaced || $cleaned) {
    $total_files_changed++;
    $total_replacements += $replaced;
    $total_cleaned += $cleaned;

    my $summary = "($replaced replacements, $cleaned attributes removed)";

    if ($dry_run) {
      print "🧪 [DRY-RUN] $file -> $summary (not written)\n" unless $quiet;
      next;
    }

    # Backup
    unless ($no_backup) {
      copy($file, "$file.bak") or warn "⚠️ Backup failed for $file: $!\n";
      print "🗂️ Backup: $file.bak\n" unless $quiet;
    }

    # Write file
    open my $out, '>:raw', $file or do { warn "⚠️ Failed write $file: $!\n"; next; };
    print $out $content;
    close $out;

    print "✅ Updated: $file $summary\n" unless $quiet;
  } else {
    print "⏭️ No change: $file\n" unless $quiet;
  }
}

print "\n🎯 Done. Files changed: $total_files_changed, total replacements: $total_replacements, total attributes cleaned: $total_cleaned\n" unless $quiet;
exit 0;
