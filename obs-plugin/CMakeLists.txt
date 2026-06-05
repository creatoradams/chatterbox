cmake_minimum_required(VERSION 3.22)
project(chatterbox VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Set OBS_DIR to your obs-studio source OR build tree with dev exports.
# Example: cmake -B build -DOBS_DIR="C:/dev/obs-studio/build"
if(NOT DEFINED OBS_DIR)
  if(DEFINED ENV{OBS_DIR})
    set(OBS_DIR "$ENV{OBS_DIR}")
  else()
    set(OBS_DIR "C:/dev/obs-studio/build" CACHE PATH "OBS Studio build directory")
  endif()
endif()

find_package(libobs REQUIRED PATHS "${OBS_DIR}")
find_package(obs-frontend-api REQUIRED PATHS "${OBS_DIR}")
find_package(Qt6 REQUIRED COMPONENTS Core Widgets)

add_library(chatterbox MODULE)

target_sources(chatterbox PRIVATE
  src/plugin-main.cpp
  src/chatterbox.cpp
  src/server-manager.cpp
)

target_link_libraries(chatterbox PRIVATE
  OBS::libobs
  OBS::obs-frontend-api
  Qt6::Core
  Qt6::Widgets
)

target_compile_definitions(chatterbox PRIVATE
  QT_NO_DEBUG_OUTPUT
  UNICODE
  _UNICODE
)

set_target_properties(chatterbox PROPERTIES
  AUTOMOC ON
  PREFIX ""
)

if(OS_WINDOWS)
  set_target_properties(chatterbox PROPERTIES SUFFIX ".dll")
endif()

# Install plugin + bundled data
install(TARGETS chatterbox
  RUNTIME DESTINATION obs-plugins/64bit
  LIBRARY DESTINATION obs-plugins/64bit
)

install(DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/data/"
  DESTINATION data/obs-plugins/chatterbox
  OPTIONAL
)
