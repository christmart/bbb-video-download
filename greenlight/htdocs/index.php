<?php

require __DIR__."/../etc/config.inc.php";

$remote_addr = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

# Get parameter
$meetingId = false;
if (preg_match('/^[a-z0-9-]+$/i', $_REQUEST['meetingId'] ?? '', $match))
	$meetingId = $match[0];

# Dispatcher
switch($_REQUEST['mode'] ?? false) {

#
# test which output is available
#
case "test": # test
	$result = [];
	$data   = json_decode(file_get_contents("php://input"));
	foreach($data->meetingIds as $meetingId) {
		$available = file_exists("$PREFIX/$meetingId/presentation_text.json");
		$result[$meetingId] = [
			'download'   => $available && file_exists("$PREFIX/$meetingId/video.mp4"),
		];
	}
	echo json_encode($result);
	break;

#
# Download BBB-Download
#
case 'download':
	if ($meetingId === false) {
		echo "No id";
		die;
	}
	$file = "$LOCATION/file/$meetingId/video.mp4";
	$name = "video.mp4";
	header("Content-Type: video/mp4");
	header("Content-Disposition: attachment;filename=\"$name\"");
	header("X-Accel-Redirect: $file");
	Analog::log("[bbb-download] $remote_addr: Downloading meetingId=$meetingId, file=$file, name=$name", Analog::INFO);
	break;

default:
	echo "Invalid mode";
	die;
}
