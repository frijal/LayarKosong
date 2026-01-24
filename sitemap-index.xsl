<?xml version='1.0' encoding='UTF-8'?>
<xsl:stylesheet version='2.0'
	xmlns:html='http://www.w3.org/TR/REC-html40'
	xmlns:sitemap='http://www.sitemaps.org/schemas/sitemap/0.9'
	xmlns:xsl='http://www.w3.org/1999/XSL/Transform'>
<xsl:output method='html' version='1.0' encoding='UTF-8' indent='yes'/>
<xsl:template match="/">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>Indeks Peta Situs XML</title>
	<meta http-equiv='Content-Type' content='text/html; charset=utf-8'/>
	<style type='text/css'>
		body {
			font: 14px 'Open Sans', Helvetica, Arial, sans-serif;
			margin: 0;
		}

		a {
			color: #3498db;
			text-decoration: none;
		}

		h1 {
			margin: 0;
		}

		#description {
			background-color: #f0f2eb;
			color: #000;
			padding: 30px 30px 20px;
		}

		#description a {
			color: #008710;
		}

		#content {
			padding: 10px 30px 30px;
			background: #fff;
		}

		a:hover {
			border-bottom: 1px solid;
		}

		th, td {
			font-size: 12px;
		}

		th {
			text-align: left;
			border-bottom: 1px solid #ccc;
		}

		th, td {
			padding: 10px 15px;
		}

		.odd {
			background: linear-gradient( 159.87deg, #f6f6f4 7.24%, #f7f4ea 64.73%, #ddedd5 116.53% );
		}

		#footer {
			margin: 20px 30px;
			font-size: 12px;
			color: #999;
		}

		#footer a {
			color: inherit;
		}

		#description a, #footer a {
			border-bottom: 1px solid;
		}

		#description a:hover, #footer a:hover {
			border-bottom: none;
		}

		img {
			max-height: 100px;
			max-width: 100px;
		}
	</style>
</head>
<body>
	<div id='description'>
		<h1>Indeks Peta Situs XML</h1>
		<xsl:choose>
			<xsl:when test='not(sitemap:sitemapindex/sitemap:sitemap)'>
				<p><strong></strong></p>
			</xsl:when>
		</xsl:choose>
		<p>Ini adalah Indeks Peta Situs XML yang dibuat oleh <a href="https://jetpack.com/">Jetpack</a>, ditujukan untuk diindeks oleh mesin pencari seperti <a href="https://www.google.com/">Google</a> atau <a href="https://www.bing.com/">Bing</a>.</p>
		<p>Anda dapat mencari lebih banyak informasi tentang peta situs XML di <a href="https://sitemaps.org">sitemaps.org</a></p>
	</div>
	<div id='content'>
		<table>
			<tr>
				<th>#</th>
				<th>URL Peta Situs</th>
				<th>Terakhir Diubah</th>
			</tr>
			<xsl:for-each select='sitemap:sitemapindex/sitemap:sitemap'>
				<tr>
					<xsl:choose>
						<xsl:when test='position() mod 2 != 1'>
							<xsl:attribute name="class">odd</xsl:attribute>
						</xsl:when>
					</xsl:choose>
					<td>
						<xsl:value-of select = "position()" />
					</td>
					<td>
						<xsl:variable name='itemURL'>
							<xsl:value-of select='sitemap:loc'/>
						</xsl:variable>
						<a href='{$itemURL}'>
							<xsl:value-of select='sitemap:loc'/>
						</a>
					</td>
					<td>
						<xsl:value-of select='sitemap:lastmod'/>
					</td>
				</tr>
			</xsl:for-each>
		</table>
	</div>
	<div id='footer'>
		<p>Dibuat oleh <a href="https://jetpack.com">Jetpack untuk WordPress</a></p>
	</div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
