import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).parents[1] / 'scripts/smoke_test.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)

class SmokeVolumeTests(unittest.TestCase):
    def test_volume_ownership_and_cleanup_even_on_failure(self):
        with patch.object(smoke.subprocess, 'check_output', return_value='test-volume\n'), patch.object(smoke.subprocess, 'run') as run:
            with self.assertRaisesRegex(RuntimeError, 'test failed'):
                with smoke.test_volume('test-image') as volume:
                    self.assertEqual(volume, 'test-volume')
                    raise RuntimeError('test failed')
            self.assertEqual(run.call_args_list[0].args[0], ['docker', 'run', '--rm', '--user', '0', '--entrypoint', 'chown', '-v', 'test-volume:/app/data', 'test-image', '1000:1000', '/app/data'])
            self.assertEqual(run.call_args_list[-1].args[0], ['docker', 'volume', 'rm', 'test-volume'])
