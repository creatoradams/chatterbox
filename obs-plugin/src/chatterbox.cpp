#include <obs-module.h>
#include <obs-frontend-api.h>
#include <util/platform.h>

#include "server-manager.hpp"

#include <QAction>
#include <QDesktopServices>
#include <QMainWindow>
#include <QMenu>
#include <QObject>
#include <QUrl>
#include <string>
#include <filesystem>

namespace {

constexpr int kPort = 3847;
constexpr int kOverlayWidth = 450;
constexpr int kOverlayHeight = 900;

chatterbox::ServerManager g_server;
QAction *s_add_overlay = nullptr;
QAction *s_dashboard = nullptr;
QAction *s_restart = nullptr;

std::string overlay_url()
{
	return "http://127.0.0.1:" + std::to_string(kPort) + "/overlay/obs";
}

std::string dashboard_url()
{
	return "http://127.0.0.1:" + std::to_string(kPort) + "/dashboard/";
}

std::string module_data_dir()
{
	const char *path = obs_get_module_data_path(obs_current_module());
	if (!path)
		return {};
	std::string result(path);
	bfree((void *)path);
	return result;
}

bool ensure_server()
{
	if (g_server.is_running())
		return true;
	const auto dir = module_data_dir();
	if (dir.empty()) {
		blog(LOG_ERROR, "[chatterbox] could not resolve plugin data directory");
		return false;
	}
	return g_server.start(dir);
}

void add_browser_source()
{
	if (!ensure_server()) {
		blog(LOG_WARNING, "[chatterbox] server not running — install Node.js 20+");
		return;
	}

	obs_source_t *current_scene = obs_frontend_get_current_scene();
	if (!current_scene) {
		blog(LOG_WARNING, "[chatterbox] no active scene");
		return;
	}

	obs_data_t *settings = obs_data_create();
	obs_data_set_string(settings, "url", overlay_url().c_str());
	obs_data_set_int(settings, "width", kOverlayWidth);
	obs_data_set_int(settings, "height", kOverlayHeight);
	obs_data_set_bool(settings, "reroute_audio", false);
	obs_data_set_bool(settings, "shutdown", true);
	obs_data_set_bool(settings, "restart_when_active", true);

	obs_source_t *source = obs_source_create("browser_source",
						 "Chatterbox Chat", settings,
						 nullptr);
	obs_data_release(settings);

	if (!source) {
		blog(LOG_ERROR, "[chatterbox] failed to create browser source");
		obs_source_release(current_scene);
		return;
	}

	obs_scene_t *scene = obs_scene_from_source(current_scene);
	obs_sceneitem_t *item = obs_scene_add(scene, source);

	obs_sceneitem_set_pos(item, 20, 20);
	obs_source_release(source);
	obs_source_release(current_scene);

	blog(LOG_INFO, "[chatterbox] added browser source to current scene");
}

void open_dashboard()
{
	if (!ensure_server())
		return;
	QDesktopServices::openUrl(QUrl(QString::fromStdString(dashboard_url())));
}

void restart_server()
{
	g_server.stop();
	if (g_server.start(module_data_dir())) {
		blog(LOG_INFO, "[chatterbox] server restarted");
	}
}

void register_menu()
{
	QMainWindow *window = (QMainWindow *)obs_frontend_get_main_window();
	if (!window)
		return;

	auto *menu = (QMenu *)obs_frontend_add_tools_menu("Chatterbox");

	s_add_overlay = new QAction("Add chat overlay to current scene", window);
	s_dashboard = new QAction("Open dashboard", window);
	s_restart = new QAction("Restart server", window);

	QObject::connect(s_add_overlay, &QAction::triggered, [] { add_browser_source(); });
	QObject::connect(s_dashboard, &QAction::triggered, [] { open_dashboard(); });
	QObject::connect(s_restart, &QAction::triggered, [] { restart_server(); });

	menu->addAction(s_add_overlay);
	menu->addAction(s_dashboard);
	menu->addSeparator();
	menu->addAction(s_restart);
}

void on_frontend_event(enum obs_frontend_event event, void *)
{
	if (event == OBS_FRONTEND_EVENT_FINISHED_LOADING) {
		const auto dir = module_data_dir();
		if (!dir.empty()) {
			g_server.start(dir);
		}
	}
}

} // namespace

void chatterbox_load()
{
	obs_frontend_add_event_callback(on_frontend_event, nullptr);
	register_menu();
}

void chatterbox_unload()
{
	g_server.stop();
}
