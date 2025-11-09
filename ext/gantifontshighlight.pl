#!/usr/bin/env perl
use strict;
use warnings;
use utf8;
use Getopt::Long;
use File::Copy qw(copy);

# CLI
my $quiet     = 0;
my $no_backup = 0;
my $dry_run   = 0;
GetOptions(
  "quiet"      => \$quiet,
  "no-backup"  => \$no_backup,
  "dry-run"    => \$dry_run,
) or die "Usage: $0 [--quiet] [--no-backup] [--dry-run]\n";

# files to scan (default)
my @files = glob("*.html artikelx/*.html artikel/*.html");
unless (@files) {
  print "⚠️  Tidak ada file HTML ditemukan.\n" unless $quiet;
  exit 0;
}

# Map: url-regex => replacement-path
my @MAP = (
  # Font Awesome CSS
#  { rx => qr{https://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/[\d\.]+/css/all\.min\.css}i, repl => '/ext/fontawesome.css' },
#  { rx => qr{https://cdn\.jsdelivr\.net/npm/\@fortawesome/fontawesome-free\@[^/]+/css/all\.min\.css}i, repl => '/ext/fontawesome.css' },
#  { rx => qr{https://use\.fontawesome\.com/releases/v[\d\.]+/css/all\.css}i, repl => '/ext/fontawesome.css' },

  # Highlight.js JS
  { rx => qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[\d\.]+/highlight\.min\.js}i, repl => '/ext/highlight.js' },
  { rx => qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release\@[^/]+/build/highlight\.min\.js}i, repl => '/ext/highlight.js' },
  { rx => qr{https://cdn\.jsdelivr\.net/npm/highlight\.js\@[^/]+/highlight\.min\.js}i, repl => '/ext/highlight.js' },

  # Highlight.js CSS
  { rx => qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[\d\.]+/styles/default\.min\.css}i, repl => '/ext/default.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release\@[^/]+/build/styles/default\.min\.css}i, repl => '/ext/default.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/npm/highlight\.js\@[^/]+/styles/default\.min\.css}i, repl => '/ext/default.min.css' },

  { rx => qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[\d\.]+/styles/github\.min\.css}i, repl => '/ext/github.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release\@[^/]+/build/styles/github\.min\.css}i, repl => '/ext/github.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/npm/highlight\.js\@[^/]+/styles/github\.min\.css}i, repl => '/ext/github.min.css' },

  { rx => qr{https://cdnjs\.cloudflare\.com/ajax/libs/highlight\.js/[\d\.]+/styles/github-dark\.min\.css}i, repl => '/ext/github-dark.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/gh/highlightjs/cdn-release\@[^/]+/build/styles/github-dark\.min\.css}i, repl => '/ext/github-dark.min.css' },
  { rx => qr{https://cdn\.jsdelivr\.net/npm/highlight\.js\@[^/]+/styles/github-dark\.min\.css}i, repl => '/ext/github-dark.min.css' },
);

sub replace_urls_in_string {
  my ($text_ref) = @_;
  my $count = 0;

  foreach my $m (@MAP) {
    my $rx   = $m->{rx};
    my $repl = $m->{repl};

    # Replace only inside href="..." or src='...'
    while ( $$text_ref =~ s{
        (\b(?:href|src)\b)       # $1 = attribute name
        (\s*=\s*)                # $2 = equals + spaces
        (['"])                    # $3 = quote
        \s*                       # optional space
        ($rx)                     # $4 = matched URL
        \s*                       # optional space
        \3                        # closing quote
      }{
        my ($attr,$eq,$q) = ($1,$2,$3);
        $attr . $eq . $q . $repl . $q;
      }gexsi
    ) { $count++; }
  }

  return $count;
}

my $total_files_changed = 0;
my $total_replacements  = 0;

foreach my $file (@files) {
  next unless -f $file;
  local $/ = undef;
  open my $in, '<:raw', $file or do { warn "⚠️ Failed open $file: $!\n"; next; };
  my $content = <$in>;
  close $in;

  my $replaced = replace_urls_in_string(\$content);

  if ($replaced) {
    $total_files_changed++;
    $total_replacements += $replaced;

    if ($dry_run) {
      print "🧪 [DRY-RUN] $file -> $replaced replacements (not written)\n" unless $quiet;
      next;
    }

    unless ($no_backup) {
      copy($file, "$file.bak") or warn "⚠️ Backup failed for $file: $!\n";
      print "🗂️ Backup: $file.bak\n" unless $quiet;
    }

    open my $out, '>:raw', $file or do { warn "⚠️ Failed write $file: $!\n"; next; };
    print $out $content;
    close $out;

    print "✅ Updated: $file ($replaced replacements)\n" unless $quiet;
  } else {
    print "⏭️  No change: $file\n" unless $quiet;
  }
}

print "\n🎯 Done. Files changed: $total_files_changed, total replacements: $total_replacements\n" unless $quiet;
exit 0;
