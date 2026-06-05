#include <obs-module.h>

OBS_DECLARE_MODULE()
OBS_MODULE_USE_DEFAULT_LOCALE("chatterbox", "en-US")

extern void chatterbox_load();
extern void chatterbox_unload();

bool obs_module_load(void)
{
	chatterbox_load();
	blog(LOG_INFO, "[chatterbox] hybrid plugin loaded");
	return true;
}

void obs_module_unload(void)
{
	chatterbox_unload();
	blog(LOG_INFO, "[chatterbox] hybrid plugin unloaded");
}
